const assert = require("node:assert/strict");
const { test } = require("node:test");
const { normalizeRequest, requireNotice, torontoToday, torontoMidnight, coversShift } = require("../lib/availabilityRequestRules");

const days = () => Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, windows: [] }));
const payload = () => ({ periodStart: "2027-01-20", clientRequestId: "test-request", days: days() });

test("Weekly requests validate dates, day coverage, times and overlaps", () => {
  const body = payload();
  body.days[0].windows = [{ startTime: "13:00", endTime: "24:00" }, { startTime: "09:00", endTime: "13:00" }];
  assert.equal(normalizeRequest(body).days[0].windows[0].startTime, "09:00");
  assert.equal(normalizeRequest(payload()).days.every(day => day.windows.length === 0), true);
  for (const invalid of [
    { ...payload(), periodStart: "2027-02-30" },
    { ...payload(), days: days().slice(1) },
    { ...payload(), days: days().map(day => ({ ...day, dayOfWeek: 1 })) },
    { ...payload(), clientRequestId: { $ne: null } }
  ]) assert.throws(() => normalizeRequest(invalid), { statusCode: 400 });
  for (const windows of [
    [{ startTime: "24:00", endTime: "24:00" }],
    [{ startTime: "09:00", endTime: "09:00" }],
    [{ startTime: "09:00", endTime: "25:00" }],
    [{ startTime: "9:00", endTime: "17:00" }],
    [{ startTime: "09:00", endTime: "12:00" }, { startTime: "11:59", endTime: "17:00" }]
  ]) {
    const invalid = payload(); invalid.days[0].windows = windows;
    assert.throws(() => normalizeRequest(invalid), { statusCode: 400 });
  }
});

test("Notice uses Toronto midnight across winter, summer and daylight saving transitions", () => {
  assert.equal(new Date(torontoMidnight("2027-01-20")).toISOString(), "2027-01-20T05:00:00.000Z");
  assert.equal(new Date(torontoMidnight("2027-07-20")).toISOString(), "2027-07-20T04:00:00.000Z");
  for (const key of ["2027-01-20", "2027-07-20", "2027-03-15", "2027-11-08"]) {
    const boundary = torontoMidnight(key) - 192 * 3600000;
    assert.doesNotThrow(() => requireNotice(key, boundary));
    assert.throws(() => requireNotice(key, boundary + 1), { statusCode: 400 });
  }
  assert.equal(torontoToday(new Date("2027-01-20T04:59:59Z")), "2027-01-19");
  assert.equal(torontoToday(new Date("2027-01-20T05:00:00Z")), "2027-01-20");
});

test("Recurring availability covers adjacent windows, respects gaps, Sunday and midnight", () => {
  const week = days();
  week[0].windows = [{ startTime: "09:00", endTime: "12:00" }, { startTime: "12:00", endTime: "17:00" }];
  const shift = { shiftDate: "2027-01-18", startTime: "09:00", endTime: "17:00" };
  assert.equal(coversShift(week, shift), true);
  week[0].windows[1].startTime = "12:01";
  assert.equal(coversShift(week, shift), false);
  week[6].windows = [{ startTime: "20:00", endTime: "24:00" }];
  assert.equal(coversShift(week, { shiftDate: "2027-01-17", startTime: "21:00", endTime: "23:59" }), true);
  assert.equal(coversShift(week, { ...shift, startTime: "08:59" }), false);
});
