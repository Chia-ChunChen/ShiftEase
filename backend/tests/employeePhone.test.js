const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { before, after, test } = require('node:test');
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { createUser } = require('../services/userService');
const app = require('../app');

if (!process.env.TEST_MONGO_URI) {
  test('Employee phone updates', { skip: 'Set TEST_MONGO_URI to a local MongoDB replica set.' }, () => {});
} else {
  let server, base, own, other;
  const accounts = {};
  const password = 'PhoneUpdateTest42';
  async function request(body, cookie = accounts.employee.cookie, method = 'PATCH', route = '/api/employees/me') {
    const response = await fetch(base + route, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }
  before(async () => {
    const uri = new URL(process.env.TEST_MONGO_URI);
    assert.equal(uri.protocol, 'mongodb:'); assert.ok(['localhost', '127.0.0.1'].includes(uri.hostname));
    await mongoose.connect(uri.href, { dbName: 'shiftease_phone_test_' + randomUUID().replaceAll('-', '') });
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port;
    for (const [key, role] of [['employee','Employee'],['other','Employee'],['orphan','Employee'],['manager','Manager'],['admin','Administrator']]) {
      const email = key + '@phone.example.test';
      const user = await createUser({ name: key, email, role, password });
      const response = await fetch(base + '/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      assert.equal(response.status, 200);
      accounts[key] = { user, cookie: response.headers.get('set-cookie').split(';')[0] };
    }
    const details = key => ({ user: accounts[key].user._id, name: key, email: key + '@phone.example.test', phone: '4165550100', position: 'Cashier' });
    own = await Employee.create(details('employee')); other = await Employee.create(details('other'));
  });
  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('Phone updates require an Employee session and completion of the temporary password flow', async () => {
    assert.equal((await request({ phone: '6473654874' }, '')).status, 401);
    for (const account of [accounts.manager, accounts.admin]) {
      assert.equal((await request({ phone: '6473654874' }, account.cookie)).status, 403);
    }
    await User.updateOne({ _id: accounts.employee.user._id }, { mustChangePassword: true });
    try { assert.equal((await request({ phone: '6473654874' })).status, 403); }
    finally { await User.updateOne({ _id: accounts.employee.user._id }, { mustChangePassword: false }); }
  });

  test('An employee saves a formatted ten-digit phone and the change survives a fresh profile load', async () => {
    const before = await Employee.findById(own._id).lean();
    const response = await request({ phone: '  (647) 365 - 4874  ' });
    assert.equal(response.status, 200);
    assert.equal(response.body.employee._id, own.id);
    assert.equal(response.body.employee.phone, '(647) 365 - 4874');
    assert.equal((await request(undefined, accounts.employee.cookie, 'GET')).body.employee.phone, '(647) 365 - 4874');
    const after = await Employee.findById(own._id).lean();
    assert.deepEqual({ ...after, phone: before.phone, updatedAt: before.updatedAt }, before);
    assert.equal((await Employee.findById(other._id)).phone, '4165550100');
    assert.equal((await User.findById(accounts.employee.user._id)).role, 'Employee');
  });

  test('The server rejects missing, invalid and non-string numbers without modifying the saved phone', async () => {
    for (const body of [undefined, null, [], {}, { phone: null }, { phone: 6473654874 }, { phone: '' }, { phone: '  ' },
      { phone: '647365487' }, { phone: '16473654874' }, { phone: '+1 6473654874' }, { phone: '647ABC4874' }, { phone: { $ne: null } }]) {
      assert.equal((await request(body)).status, 400, JSON.stringify(body));
      assert.equal((await Employee.findById(own._id)).phone, '(647) 365 - 4874');
    }
  });

  test('Self-service cannot select another employee or change account and work fields', async () => {
    for (const extra of [{ employeeId: other.id }, { user: accounts.other.user._id }, { name: 'Changed' },
      { email: 'changed@example.test' }, { position: 'Manager' }, { role: 'Administrator' }, { $set: { phone: '6473654874' } }]) {
      assert.equal((await request({ phone: '6473654874', ...extra })).status, 400);
    }
    assert.equal((await request({ phone: '6473654874' }, accounts.employee.cookie, 'PUT', '/api/employees/' + other.id)).status, 403);
    assert.equal((await Employee.findById(other._id)).phone, '4165550100');
    assert.equal((await Employee.findById(own._id)).name, 'employee');
    assert.equal((await Employee.findById(own._id)).phone, '(647) 365 - 4874');
  });

  test('An account without a linked employee profile receives a clear 404 and creates no record', async () => {
    const count = await Employee.countDocuments();
    const response = await request({ phone: '6473654874' }, accounts.orphan.cookie);
    assert.equal(response.status, 404);
    assert.equal(response.body.message, 'Employee profile not found.');
    assert.equal(await Employee.countDocuments(), count);
  });
}
