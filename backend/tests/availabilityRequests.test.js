const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const { before, after, test } = require("node:test");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Availability = require("../models/Availability");
const AvailabilityRequest = require("../models/AvailabilityRequest");
const { createUser } = require("../services/userService");
const requestService = require("../services/availabilityRequestService");
const scheduleService = require("../services/scheduleService");
const { torontoToday } = require("../lib/availabilityRequestRules");

if (!process.env.TEST_MONGO_URI) {
  test("Availability request API", { skip: "Set TEST_MONGO_URI to a local MongoDB replica set." }, () => {});
} else {
  let server, base, employee, otherEmployee, employeeCookie, otherCookie, managerCookie, adminCookie;
  const password = "TestPassword42";
  const day = (offset) => {
    const date = new Date(torontoToday() + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const week = () => Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1,
    windows: [{ startTime: "09:00", endTime: "17:00" }] }));
  const payload = () => ({ periodStart: day(12), days: week(), clientRequestId: randomUUID() });
  async function api(path, { method = "GET", cookie, body } = {}) {
    const response = await fetch(base + "/api/availability" + path, { method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  async function account(email, role) {
    const user = await createUser({ name: role, email, role, password });
    const response = await fetch(base + "/api/users/login", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    assert.equal(response.status, 200);
    return { user, cookie: response.headers.get("set-cookie").split(";")[0] };
  }
  before(async () => {
    const url = new URL(process.env.TEST_MONGO_URI);
    assert.equal(url.protocol, "mongodb:");
    assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
    await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: "shiftease_requests_test_" + randomUUID().replaceAll("-", "") });
    await AvailabilityRequest.init();
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = "http://127.0.0.1:" + server.address().port;
    const first = await account("employee@example.test", "Employee");
    const second = await account("other@example.test", "Employee");
    employeeCookie = first.cookie; otherCookie = second.cookie;
    const details = (user, email) => ({ user: user._id, name: "Test Employee", email, phone: "555-010-1234", position: "Cashier" });
    employee = await Employee.create(details(first.user, "employee@example.test"));
    otherEmployee = await Employee.create(details(second.user, "other@example.test"));
    managerCookie = (await account("manager@example.test", "Manager")).cookie;
    adminCookie = (await account("admin@example.test", "Administrator")).cookie;
  });
  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("New routes require authentication and enforce employee/staff roles", async () => {
    for (const [path, method] of [["/current", "GET"], ["/requests/mine", "GET"], ["/requests", "GET"],
      ["/requests", "POST"], ["/requests/invalid/approve", "PUT"]]) {
      assert.equal((await api(path, { method })).status, 401);
    }
    assert.deepEqual((await api("/current", { cookie: employeeCookie })).data, { data: null });
    assert.deepEqual((await api("/requests/mine", { cookie: employeeCookie })).data, { data: [] });
    assert.equal((await api("/requests", { cookie: employeeCookie })).status, 403);
    assert.equal((await api("/requests/invalid/approve", { method: "PUT", cookie: employeeCookie })).status, 403);
    assert.equal((await api("/requests", { method: "POST", cookie: managerCookie, body: payload() })).status, 403);
    assert.equal((await api("/requests?status=invalid", { cookie: managerCookie })).status, 400);
    assert.equal((await api("/requests/invalid/approve", { method: "PUT", cookie: managerCookie })).status, 400);
    assert.equal((await api(`/requests/${new mongoose.Types.ObjectId()}/approve`, { method: "PUT", cookie: managerCookie })).status, 404);
  });

  test("Employee submits once, reads only their requests, and manager approval is idempotent", async () => {
    const body = { ...payload(), employee: otherEmployee._id, status: "approved" };
    const results = await Promise.all(Array.from({ length: 5 }, () => api("/requests", { method: "POST", cookie: employeeCookie, body })));
    assert.equal(results.filter(result => result.status === 201).length, 1, JSON.stringify(results));
    assert.equal(results.every(result => [200, 201].includes(result.status)), true);
    const saved = results[0].data.data;
    assert.equal(saved.employee, employee.id);
    assert.equal(saved.status, "pending");
    assert.equal(new Set(results.map(result => result.data.data._id)).size, 1);
    assert.equal(await AvailabilityRequest.countDocuments({ clientRequestId: body.clientRequestId }), 1);
    assert.equal((await api("/requests/mine", { cookie: employeeCookie })).data.data.length, 1);
    assert.equal((await api("/requests/mine", { cookie: otherCookie })).data.data.length, 0);
    const conflict = await api("/requests", { method: "POST", cookie: employeeCookie, body: { ...body, periodStart: day(13) } });
    assert.equal(conflict.status, 409);
    const pending = await api("/requests?status=pending", { cookie: managerCookie });
    assert.equal(pending.data.data[0].employee.name, "Test Employee");
    const approvals = await Promise.all([managerCookie, adminCookie].map(cookie => api(`/requests/${saved._id}/approve`, { method: "PUT", cookie })));
    assert.equal(approvals.every(result => result.status === 200 && result.data.data.status === "approved"), true);
    assert.equal(approvals[0].data.data.approvedAt, approvals[1].data.data.approvedAt);
    assert.equal((await api("/requests?status=pending", { cookie: managerCookie })).data.data.length, 0);
    assert.equal((await api("/requests?status=approved", { cookie: adminCookie })).data.data.length, 1);
    // Approval alone must not activate a future week.
    assert.equal((await api("/current", { cookie: employeeCookie })).data.data, null);
  });

  test("Invalid input is rejected, including insufficient notice and overlapping windows", async () => {
    const overlap = payload();
    overlap.days[0].windows.push({ startTime: "16:00", endTime: "18:00" });
    for (const body of [overlap, { ...payload(), periodStart: day(1) }, { ...payload(), periodStart: "2027-02-30" },
      { ...payload(), days: [] }, { ...payload(), clientRequestId: undefined }]) {
      assert.equal((await api("/requests", { method: "POST", cookie: employeeCookie, body })).status, 400);
    }
    const orphan = await account("orphan@example.test", "Employee");
    assert.equal((await api("/current", { cookie: orphan.cookie })).status, 409);
    await User.updateOne({ _id: orphan.user._id }, { mustChangePassword: true });
    assert.equal((await api("/current", { cookie: orphan.cookie })).status, 403);
  });

  test("Current week uses latest effective period and approval; retries work after the notice deadline", async () => {
    const first = await AvailabilityRequest.create({ employee: otherEmployee._id, ...payload(), periodStart: day(-3), status: "approved", approvedAt: new Date(1000) });
    await AvailabilityRequest.create({ employee: otherEmployee._id, ...payload(), periodStart: day(-4), status: "approved", approvedAt: new Date(3000) });
    await AvailabilityRequest.create({ employee: otherEmployee._id, ...payload(), periodStart: day(1), status: "approved", approvedAt: new Date(4000) });
    await AvailabilityRequest.create({ employee: otherEmployee._id, ...payload(), periodStart: day(-1) });
    assert.equal((await api("/current", { cookie: otherCookie })).data.data._id, first.id);
    const replacement = await AvailabilityRequest.create({ employee: otherEmployee._id, ...payload(), periodStart: day(-3), status: "approved", approvedAt: new Date(2000) });
    assert.equal((await api("/current", { cookie: otherCookie })).data.data._id, replacement.id);
    const retry = await api("/requests", { method: "POST", cookie: otherCookie,
      body: { periodStart: first.periodStart, days: first.days, clientRequestId: first.clientRequestId } });
    assert.equal(retry.status, 200);
    assert.equal(retry.data.data._id, first.id);
  });

  test("Approved recurring weeks drive assignment and publishing, override legacy records and allow empty weeks", async () => {
    const shiftDate = day(20);
    const shift = await scheduleService.createSchedule({ shiftDate, startTime: "10:00", endTime: "16:00" });
    assert.equal((await scheduleService.getAvailableEmployees(shift.id)).some(person => person.id === employee.id), true);
    await scheduleService.assignEmployee(shift.id, employee.id);
    assert.equal((await scheduleService.publishSchedule(shift.id)).status, "published");
    await assert.rejects(scheduleService.updateSchedule(shift.id, { endTime: "18:00" }), { statusCode: 409 });
    await Availability.create({ employee: employee._id, availableDate: shiftDate, startTime: "08:00", endTime: "20:00" });
    const unavailable = await api("/requests", { method: "POST", cookie: employeeCookie,
      body: { ...payload(), periodStart: day(15), days: week().map(value => ({ ...value, windows: [] })) } });
    assert.equal(unavailable.status, 201);
    assert.equal((await api(`/requests/${unavailable.data.data._id}/approve`, { method: "PUT", cookie: managerCookie })).status, 200);
    assert.equal((await requestService.availableEmployeeIds(shift, [employee._id])).length, 0);
    assert.equal((await scheduleService.getAvailableEmployees(shift.id)).some(person => person.id === employee.id), false);
    const nextShift = await scheduleService.createSchedule({ shiftDate: day(21), startTime: "10:00", endTime: "16:00" });
    await assert.rejects(scheduleService.assignEmployee(nextShift.id, employee.id), { statusCode: 409 });
    const legacyShift = await scheduleService.createSchedule({ shiftDate: day(2), startTime: "10:00", endTime: "16:00" });
    await Availability.create({ employee: employee._id, availableDate: day(2), startTime: "09:00", endTime: "17:00" });
    assert.equal((await scheduleService.getAvailableEmployees(legacyShift.id)).some(person => person.id === employee.id), true);
  });
}
