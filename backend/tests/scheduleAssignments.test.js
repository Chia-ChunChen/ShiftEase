const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { before, after, test } = require('node:test');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Schedule = require('../models/Schedule');
const Request = require('../models/AvailabilityRequest');
const User = require('../models/User');
const { createUser } = require('../services/userService');
const service = require('../services/scheduleService');
const app = require('../app');
const DATE = '2030-12-03';
let sequence = 0, server, base, managerCookie, employeeCookie;
const password = 'SchedulingTest42';

if (!process.env.TEST_MONGO_URI) {
  test('Personal employee shifts', { skip: 'Set TEST_MONGO_URI to a local MongoDB replica set.' }, () => {});
} else {
  before(async () => {
    const url = new URL(process.env.TEST_MONGO_URI);
    assert.equal(url.protocol, 'mongodb:');
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
    await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: 'shiftease_shifts_test_' + randomUUID().replaceAll('-', '') });
    await Promise.all([Schedule.init(), Employee.init(), Request.init(), User.init()]);
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port;
    for (const role of ['Manager', 'Employee']) {
      const email = role.toLowerCase() + '@shifts.example.test';
      await createUser({ name: role, email, role, password });
      const response = await fetch(base + '/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie').split(';')[0];
      if (role === 'Manager') managerCookie = cookie; else employeeCookie = cookie;
    }
  });
  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  async function employee(startTime = '08:00', endTime = '18:00') {
    const person = await Employee.create({ name: 'Person ' + ++sequence, email: `person${sequence}@example.test`, phone: '4165550100', position: 'Cashier' });
    await Request.create({ employee: person._id, clientRequestId: randomUUID(), periodStart: '2030-12-02', status: 'approved', approvedAt: new Date(),
      days: Array.from({ length: 7 }, (_, index) => ({ dayOfWeek: index + 1, windows: [{ startTime, endTime }] })) });
    return person;
  }
  const day = () => service.createSchedule({ shiftDate: DATE, startTime: '08:00', endTime: '18:00' });
  async function api(route, method, body, cookie = managerCookie) {
    const response = await fetch(base + '/api/schedules' + route, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }

  test('An approved partial-day employee appears for a full work day and multiple people cover different parts', async () => {
    const middle = await employee('10:00', '14:00'), early = await employee('08:00', '12:00'), late = await employee('12:00', '18:00');
    const work = await day();
    const candidate = (await service.getAvailableEmployees(work.id)).find(person => person.id === middle.id);
    assert.deepEqual(candidate.availableWindows, [{ startTime: '10:00', endTime: '14:00' }]);
    let saved = await service.assignEmployee(work.id, middle.id, { startTime: '10:00', endTime: '14:00' });
    assert.deepEqual(saved.coverage.map(part => part.employeeCount), [0, 1, 0]);
    await service.assignEmployee(work.id, early.id, { startTime: '08:00', endTime: '12:00' });
    saved = await service.assignEmployee(work.id, late.id, { startTime: '12:00', endTime: '18:00' });
    assert.equal(saved.assignments.length, 3);
    assert.equal(saved.employees.length, 3);
    assert.ok(saved.coverage.every(part => part.employeeCount >= 1));
    await assert.rejects(service.assignEmployee(work.id, middle.id, { startTime: '09:00', endTime: '10:00' }), { statusCode: 409 });
  });

  test('A person can work separate blocks; overlaps are rejected and only remaining free windows are offered', async () => {
    const person = await employee('10:00', '14:00'), work = await day();
    await service.assignEmployee(work.id, person.id, { startTime: '10:00', endTime: '11:00' });
    const saved = await service.assignEmployee(work.id, person.id, { startTime: '13:00', endTime: '14:00' });
    assert.equal(saved.employees.length, 1);
    const candidate = (await service.getAvailableEmployees(work.id)).find(item => item.id === person.id);
    assert.deepEqual(candidate.availableWindows, [{ startTime: '11:00', endTime: '13:00' }]);
    await assert.rejects(service.assignEmployee(work.id, person.id, { startTime: '10:30', endTime: '12:00' }), { statusCode: 409 });
    const other = await day();
    await assert.rejects(service.assignEmployee(other.id, person.id, { startTime: '12:00', endTime: '13:30' }), { statusCode: 409 });
    const adjacent = await service.assignEmployee(other.id, person.id, { startTime: '11:00', endTime: '13:00' });
    assert.equal(adjacent.assignments.length, 1);
  });

  test('Concurrent assignments to different work days cannot double-book an employee', async () => {
    const person = await employee(), first = await day(), second = await day();
    const results = await Promise.allSettled([first, second].map(work => service.assignEmployee(work.id, person.id, { startTime: '15:00', endTime: '16:00' })));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
  });

  test('Editing day hours preserves personal shifts, rejects truncation, and edits unpublish a day', async () => {
    const person = await employee('10:00', '14:00'), work = await day();
    const saved = await service.assignEmployee(work.id, person.id, { startTime: '10:00', endTime: '13:00' });
    const id = String(saved.assignments[0]._id);
    const published = await service.publishSchedule(work.id);
    assert.equal(published.status, 'published');
    const expanded = await service.updateSchedule(work.id, { startTime: '07:00', endTime: '19:00' });
    assert.equal(expanded.assignments[0].startTime, '10:00');
    assert.equal(expanded.assignments[0].endTime, '13:00');
    assert.equal(expanded.status, 'draft');
    await assert.rejects(service.updateSchedule(work.id, { startTime: '11:00' }), { statusCode: 409 });
    await assert.rejects(service.updateAssignment(work.id, id, { startTime: '10:00', endTime: '15:00' }), { statusCode: 409 });
    const changed = await service.updateAssignment(work.id, id, { startTime: '11:00', endTime: '14:00' });
    assert.equal(changed.assignments[0].startTime, '11:00');
    const removed = await service.removeAssignment(work.id, id);
    assert.equal(removed.assignments.length, 0);
    assert.equal(removed.employees.length, 0);
    await assert.rejects(service.publishSchedule(work.id), { statusCode: 400 });
  });

  test('Legacy schedules read without database changes and retain their original employee hours when edited', async () => {
    const original = await employee(), added = await employee('10:00', '14:00');
    const id = new mongoose.Types.ObjectId();
    await Schedule.collection.insertOne({ _id: id, shiftDate: new Date(DATE + 'T00:00:00Z'), startTime: '08:00', endTime: '12:00',
      employees: [original._id], status: 'published', publishedAt: new Date() });
    const read = (await service.getAllSchedules()).find(work => work.id === String(id));
    assert.equal(read.assignments[0].startTime, '08:00');
    assert.equal(read.assignments[0].endTime, '12:00');
    assert.equal((await Schedule.collection.findOne({ _id: id })).assignments, undefined);
    const expanded = await service.updateSchedule(String(id), { endTime: '18:00' });
    assert.equal(expanded.assignments[0].startTime, '08:00');
    assert.equal(expanded.assignments[0].endTime, '12:00');
    const changed = await service.updateAssignment(String(id), String(expanded.assignments[0]._id), { startTime: '08:00', endTime: '10:00' });
    assert.equal(changed.assignments[0].startTime, '08:00');
    assert.equal(changed.assignments[0].endTime, '10:00');
    assert.equal(changed.status, 'draft');
    const final = await service.assignEmployee(String(id), added.id, { startTime: '10:00', endTime: '12:00' });
    assert.equal(final.assignments.length, 2);
  });

  test('Weekly saves are atomic, and assignment routes validate input and enforce staff access', async () => {
    const count = await Schedule.countDocuments();
    const invalid = await api('/weekly', 'POST', { entries: [
      { shiftDate: '2030-12-04', startTime: '08:00', endTime: '18:00' },
      { shiftDate: '2030-12-05', startTime: '18:00', endTime: '08:00' }
    ] });
    assert.equal(invalid.status, 400);
    assert.equal(await Schedule.countDocuments(), count);
    const batch = await api('/weekly', 'POST', { entries: [
      { shiftDate: '2030-12-04', startTime: '08:00', endTime: '18:00' },
      { shiftDate: '2030-12-05', startTime: '08:00', endTime: '18:00' }
    ] });
    assert.equal(batch.status, 201);
    assert.equal(batch.body.data.length, 2);
    const person = await employee('10:00', '14:00'), work = batch.body.data[0];
    const added = await api(`/${work._id}/employees`, 'PUT', { employeeId: person.id, startTime: '10:00', endTime: '12:00' });
    assert.equal(added.status, 200);
    const assignmentId = added.body.data.assignments[0]._id;
    assert.equal((await api(`/${work._id}/assignments/${assignmentId}`, 'PUT', { startTime: '11:00', endTime: '12:00' }, employeeCookie)).status, 403);
    assert.equal((await api(`/${work._id}/assignments/${assignmentId}`, 'PUT', { startTime: '11:00', endTime: '13:00' })).status, 200);
    assert.equal((await api(`/${work._id}/assignments/${assignmentId}`, 'DELETE')).status, 200);
    assert.equal((await api(`/${work._id}/employees`, 'PUT', { employeeId: person.id, startTime: '10:00' })).status, 400);
  });
}
