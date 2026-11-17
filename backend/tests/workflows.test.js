const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const { after, before, test } = require("node:test");
const mongoose = require("mongoose");
const app = require("../app");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Schedule = require("../models/Schedule");
const Availability = require("../models/Availability");
const { createUser } = require("../services/userService");

const mongoUri = process.env.TEST_MONGO_URI;
let server;
let base;

if (!mongoUri) {
  test("ShiftEase workflows", { skip: "Set TEST_MONGO_URI to a local MongoDB replica set." }, () => {});
} else {
  before(async () => {
    const url = new URL(mongoUri);
    assert.equal(url.protocol, "mongodb:");
    assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Use a local test server only.");
    await mongoose.connect(mongoUri, { dbName: "shiftease_test_" + randomUUID().replaceAll("-", "") });
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = "http://127.0.0.1:" + server.address().port;
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  async function request(path, { method = "GET", cookie, body, origin } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    if (origin) headers.Origin = origin;
    const response = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
    const data = response.status === 204 ? null : await response.json();
    return { status: response.status, data, cookie: response.headers.get("set-cookie") };
  }

  async function login(email, password) {
    return request("/api/users/login", { method: "POST", body: { email, password } });
  }

  function cookieFrom(result) {
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.match(result.cookie, /HttpOnly/);
    return result.cookie.split(";")[0];
  }

  test("Staff provision accounts, employees change passwords and save their own availability, and shift edits revalidate assignments", async () => {
    const initial = "StrongPassword42";
    const employeeDetails = (email) => ({ name: "Test Employee", email, phone: "555-010-1234", position: "Cashier" });
    await createUser({ name: "Admin", email: "admin@example.test", password: initial, role: "Administrator" });
    await createUser({ name: "Manager", email: "manager@example.test", password: initial, role: "Manager" });

    assert.equal((await request("/api/employees", { method: "POST", body: employeeDetails("person@example.test") })).status, 401);
    assert.equal((await request("/api/users", { method: "POST", body: employeeDetails("person@example.test") })).status, 401);
    assert.equal((await request("/api/schedules")).status, 401);
    const admin = cookieFrom(await login("admin@example.test", initial));
    const manager = cookieFrom(await login(" MANAGER@example.test ", initial));
    assert.equal((await request("/api/users", { cookie: manager })).status, 403);
    assert.equal((await request("/api/users", { cookie: admin })).status, 200);
    assert.equal((await request("/api/employees", {
      method: "POST", cookie: manager, origin: "https://unrelated.example", body: employeeDetails("person@example.test")
    })).status, 403);

    const preexisting = await request("/api/users", {
      method: "POST", cookie: admin, body: { ...employeeDetails("person@example.test"), role: "Employee" }
    });
    assert.equal(preexisting.status, 201, JSON.stringify(preexisting.data));
    const preexistingHash = (await User.findById(preexisting.data.user._id).select("+password")).password;
    assert.equal(preexisting.data.user.password, undefined);
    const linked = await request("/api/employees", {
      method: "POST", cookie: manager, body: employeeDetails(" PERSON@example.test ")
    });
    assert.equal(linked.status, 201, JSON.stringify(linked.data));
    assert.equal(linked.data.data.user, preexisting.data.user._id);
    assert.equal(linked.data.temporaryPassword, undefined);
    assert.equal((await User.findById(preexisting.data.user._id).select("+password")).password, preexistingHash);
    assert.equal(await User.countDocuments({ email: "person@example.test" }), 1);

    const conflictingEmail = await request("/api/employees", {
      method: "POST", cookie: manager, body: employeeDetails("admin@example.test")
    });
    assert.equal(conflictingEmail.status, 409);
    assert.equal(await Employee.countDocuments({ email: "admin@example.test" }), 0);

    const legacy = await Employee.create(employeeDetails("legacy@example.test"));
    const legacyUser = await request("/api/users", {
      method: "POST", cookie: admin, body: { ...employeeDetails("legacy@example.test"), role: "Employee" }
    });
    assert.equal(legacyUser.status, 201);
    assert.equal((await Employee.findById(legacy._id)).user.toString(), legacyUser.data.user._id);

    const newAccount = await request("/api/employees", {
      method: "POST", cookie: admin, body: { ...employeeDetails("new@example.test"), role: "Administrator" }
    });
    assert.equal(newAccount.status, 201, JSON.stringify(newAccount.data));
    const temp = newAccount.data.temporaryPassword;
    assert.ok(temp.length >= 24);
    const newUser = await User.findById(newAccount.data.data.user).select("+password");
    assert.equal(newUser.role, "Employee");
    assert.notEqual(newUser.password, temp);
    const duplicate = await request("/api/employees", {
      method: "POST", cookie: manager, body: employeeDetails("new@example.test")
    });
    assert.equal(duplicate.status, 409);
    const unavailableId = linked.data.data._id;

    const oldSession = cookieFrom(await login("new@example.test", temp));
    const otherSession = cookieFrom(await login("new@example.test", temp));
    const profile = await request("/api/users/me", { cookie: oldSession });
    assert.equal(profile.data.user.mustChangePassword, true);
    assert.equal(profile.data.employee._id, newAccount.data.data._id);
    assert.equal((await request("/api/availability", { cookie: oldSession })).status, 403);
    assert.equal((await request("/api/users/me/password", {
      method: "PUT", cookie: oldSession, body: { currentPassword: temp, newPassword: initial }
    })).status, 204);
    assert.equal((await request("/api/users/me", { cookie: otherSession })).status, 401);
    assert.equal((await login("new@example.test", temp)).status, 401);
    const employee = cookieFrom(await login("new@example.test", initial));
    assert.equal((await request("/api/schedules", { cookie: employee })).status, 403);

    const date = "2026-11-18";
    const span = (availableDate, startTime, endTime) => ({ availableDate, startTime, endTime, employee: unavailableId });
    const saved = await request("/api/availability/weekly", {
      method: "POST", cookie: employee, body: { entries: [span(date, "08:00", "14:00")] }
    });
    assert.equal(saved.status, 201, JSON.stringify(saved.data));
    assert.equal(saved.data.availability[0].employee, newAccount.data.data._id);
    assert.equal((await request("/api/availability", { cookie: employee })).data.data.length, 1);
    assert.equal((await request("/api/availability", { cookie: manager })).data.data.length, 1);
    const batchConflict = await request("/api/availability/weekly", {
      method: "POST", cookie: employee, body: { entries: [
        span("2026-11-19", "09:00", "10:00"), span(date, "09:00", "10:00")
      ] }
    });
    assert.equal(batchConflict.status, 409);
    assert.equal(await Availability.countDocuments(), 1);

    const invalidBatch = await request("/api/schedules/weekly", {
      method: "POST", cookie: manager, body: { entries: [
        { shiftDate: date, startTime: "09:00", endTime: "11:00" },
        { shiftDate: "2026-11-31", startTime: "09:00", endTime: "11:00" }
      ] }
    });
    assert.equal(invalidBatch.status, 400);
    assert.equal(await Schedule.countDocuments(), 0);
    const makeShift = (startTime, endTime) => request("/api/schedules/weekly", {
      method: "POST", cookie: manager, body: { entries: [{ shiftDate: date, startTime, endTime }] }
    });
    const first = await makeShift("09:00", "11:00");
    const second = await makeShift("10:00", "12:00");
    assert.equal(first.status, 201, JSON.stringify(first.data));
    assert.equal(second.status, 201, JSON.stringify(second.data));
    const shifts = [first.data.data[0]._id, second.data.data[0]._id];
    const employeeId = newAccount.data.data._id;
    const outcomes = await Promise.all(shifts.map(id => request("/api/schedules/" + id + "/employees", {
      method: "PUT", cookie: manager, body: { employeeId }
    })));
    assert.deepEqual(outcomes.map(result => result.status).sort(), [200, 409]);
    const chosen = shifts[outcomes.findIndex(result => result.status === 200)];
    const invalidEdit = await request("/api/schedules/" + chosen, {
      method: "PUT", cookie: manager, body: { startTime: "15:00", endTime: "17:00" }
    });
    assert.equal(invalidEdit.status, 409);
    assert.equal((await Schedule.findById(chosen)).employees[0].toString(), employeeId);
    const validEdit = await request("/api/schedules/" + chosen, {
      method: "PUT", cookie: manager, body: { startTime: "12:00", endTime: "13:00" }
    });
    assert.equal(validEdit.status, 200, JSON.stringify(validEdit.data));
    const published = await request("/api/schedules/" + chosen + "/publish", { method: "PUT", cookie: manager });
    assert.equal(published.data?.data?.status, "published");
    assert.equal((await request("/api/users/logout", { method: "POST", cookie: employee })).status, 204);
    assert.equal((await request("/api/users/me", { cookie: employee })).status, 401);
  });
}
