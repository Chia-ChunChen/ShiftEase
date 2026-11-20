const mongoose = require("mongoose");
const AvailabilityRequest = require("../models/AvailabilityRequest");
const Availability = require("../models/Availability");
const Employee = require("../models/Employee");
const { mergeWindows } = require('../lib/scheduleWindows');
const httpError = require("../lib/httpError");
const { normalizeRequest, requireNotice, torontoToday } = require("../lib/availabilityRequestRules");

function samePayload(request, payload) {
  const days = request.days.map(day => ({ dayOfWeek: day.dayOfWeek,
    windows: day.windows.map(window => ({ startTime: window.startTime, endTime: window.endTime })) }));
  return request.periodStart === payload.periodStart && JSON.stringify(days) === JSON.stringify(payload.days);
}

function replay(request, payload) {
  if (!samePayload(request, payload)) throw httpError(409, "This request ID was already used for different availability.");
  return { request, created: false };
}

async function submit(employee, body) {
  const payload = normalizeRequest(body);
  const identity = { employee, clientRequestId: payload.clientRequestId };
  const existing = await AvailabilityRequest.findOne(identity);
  // Retries must still succeed after the original request's notice deadline.
  if (existing) return replay(existing, payload);
  requireNotice(payload.periodStart);
  await AvailabilityRequest.init();
  try {
    const request = await AvailabilityRequest.create({ employee, ...payload });
    return { request, created: true };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const winner = await AvailabilityRequest.findOne(identity);
    if (!winner) throw error;
    return replay(winner, payload);
  }
}

async function current(employee, today = torontoToday()) {
  return AvailabilityRequest.findOne({ employee, status: "approved", periodStart: { $lte: today } })
    .sort({ periodStart: -1, approvedAt: -1, _id: -1 });
}

async function mine(employee) {
  return AvailabilityRequest.find({ employee }).sort({ submittedAt: -1, _id: -1 });
}

async function list(status = "pending") {
  if (!["pending", "approved"].includes(status)) throw httpError(400, "Invalid request status.");
  return AvailabilityRequest.find({ status }).populate("employee", "name email position")
    .sort({ submittedAt: 1, _id: 1 });
}

async function approve(id, approvedBy) {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, "Invalid availability request ID.");
  return mongoose.connection.transaction(async session => {
    const request = await AvailabilityRequest.findById(id).session(session);
    if (!request) throw httpError(404, "Availability request not found.");
    if (request.status === "approved") return request;
    // Serialize approvals with availability writes and shift assignment checks.
    const lock = await Employee.updateOne({ _id: request.employee },
      { $inc: { availabilityRevision: 1, scheduleRevision: 1 } }, { session, timestamps: false });
    if (!lock.matchedCount) throw httpError(409, "The employee for this request no longer exists.");
    request.set({ status: "approved", approvedAt: new Date(), approvedBy });
    return request.save({ session });
  });
}

// Approved recurring weeks override legacy dated records from their start date.
async function availableEmployeeWindows(shift, employeeIds, session = null) {
  const start = new Date(shift.shiftDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const scope = employeeIds ? { employee: { $in: employeeIds } } : {};
  const legacy = await Availability.find({ ...scope, availableDate: { $gte: start, $lt: end } })
    .select('employee startTime endTime').session(session).lean();
  const weeks = await AvailabilityRequest.find({ ...scope, status: "approved",
    periodStart: { $lte: start.toISOString().slice(0, 10) } })
    .sort({ periodStart: -1, approvedAt: -1, _id: -1 }).session(session).lean();
  const available = new Map();
  for (const record of legacy) {
    const id = record.employee.toString();
    if (!available.has(id)) available.set(id, { employee: record.employee, windows: [] });
    available.get(id).windows.push({ startTime: record.startTime, endTime: record.endTime });
  }
  const seen = new Set();
  for (const week of weeks) {
    const id = week.employee.toString();
    if (seen.has(id)) continue;
    seen.add(id);
    const dayOfWeek = start.getUTCDay() || 7;
    const windows = week.days.find(day => day.dayOfWeek === dayOfWeek)?.windows ?? [];
    available.set(id, { employee: week.employee, windows });
  }
  return [...available.values()].map(record => ({ ...record, windows: mergeWindows(record.windows) }));
}

async function availableEmployeeIds(shift, employeeIds, session = null) {
  const records = await availableEmployeeWindows(shift, employeeIds, session);
  return records.filter(record => record.windows.some(window => window.startTime <= shift.startTime &&
    window.endTime >= shift.endTime)).map(record => record.employee);
}

module.exports = { submit, current, mine, list, approve, availableEmployeeIds, availableEmployeeWindows };
