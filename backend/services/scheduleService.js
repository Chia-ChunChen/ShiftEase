const mongoose = require("mongoose");
const Schedule = require("../models/Schedule");
const Employee = require("../models/Employee");
const Availability = require("../models/Availability");
const httpError = require("../lib/httpError");

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, "Invalid date format. Use YYYY-MM-DD.");
  }
  const date = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw httpError(400, "Invalid shift date.");
  }
  return date;
}

function validateTimes(startTime, endTime) {
  if (typeof startTime !== "string" || typeof endTime !== "string" ||
      !TIME.test(startTime) || !TIME.test(endTime)) {
    throw httpError(400, "Invalid time format. Use HH:mm.");
  }
  if (endTime <= startTime) throw httpError(400, "End time must be after start time.");
}

function newShift(data) {
  const { shiftDate, startTime, endTime } = data ?? {};
  if (!shiftDate || !startTime || !endTime) throw httpError(400, "All fields are required.");
  const date = parseDate(shiftDate);
  validateTimes(startTime, endTime);
  return { shiftDate: date, startTime, endTime, employees: [] };
}

async function createSchedule(data) {
  return Schedule.create(newShift(data));
}

async function createWeeklySchedule(entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 7) {
    throw httpError(400, "Select one to seven shift dates.");
  }
  const shifts = entries.map(newShift);
  if (new Set(shifts.map(shift => shift.shiftDate.getTime())).size !== shifts.length) {
    throw httpError(400, "Enter one shift per date in the weekly form.");
  }
  await Schedule.init();
  return mongoose.connection.transaction(session => Schedule.insertMany(shifts, { session }));
}

async function getAllSchedules() {
  return Schedule.find().populate("employees").sort({ shiftDate: 1, startTime: 1 });
}

function dayRange(shiftDate) {
  const start = new Date(shiftDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
}

function conflictFilter(shift) {
  return {
    _id: { $ne: shift._id },
    shiftDate: dayRange(shift.shiftDate),
    startTime: { $lt: shift.endTime },
    endTime: { $gt: shift.startTime }
  };
}

function availabilityFilter(shift) {
  return {
    availableDate: dayRange(shift.shiftDate),
    startTime: { $lte: shift.startTime },
    endTime: { $gte: shift.endTime }
  };
}

async function validateAssignments(shift, employeeIds, session) {
  if (!employeeIds.length) return;
  // Serialize assignments touching the same employee across concurrent shifts.
  const employees = await Employee.updateMany(
    { _id: { $in: employeeIds } },
    { $inc: { scheduleRevision: 1 } },
    { session, timestamps: false }
  );
  if (employees.matchedCount !== employeeIds.length) {
    throw httpError(409, "An assigned employee no longer exists.");
  }
  const conflict = await Schedule.exists({
    ...conflictFilter(shift), employees: { $in: employeeIds }
  }).session(session);
  if (conflict) throw httpError(409, "An assigned employee has a conflicting shift.");
  const available = await Availability.find({
    ...availabilityFilter(shift), employee: { $in: employeeIds }
  }).select("employee").session(session);
  if (new Set(available.map(record => record.employee.toString())).size !== employeeIds.length) {
    throw httpError(409, "An assigned employee is not available for this shift.");
  }
}

function requireId(id, message) {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, message);
}

async function updateSchedule(scheduleId, updateData) {
  requireId(scheduleId, "Invalid schedule ID.");
  const { shiftDate, startTime, endTime } = updateData ?? {};
  if (shiftDate === undefined && startTime === undefined && endTime === undefined) {
    throw httpError(400, "No schedule fields provided.");
  }
  return mongoose.connection.transaction(async session => {
    const schedule = await Schedule.findById(scheduleId).session(session);
    if (!schedule) return null;
    const next = {
      _id: schedule._id,
      shiftDate: shiftDate === undefined ? schedule.shiftDate : parseDate(shiftDate),
      startTime: startTime === undefined ? schedule.startTime : startTime,
      endTime: endTime === undefined ? schedule.endTime : endTime
    };
    validateTimes(next.startTime, next.endTime);
    await validateAssignments(next, schedule.employees, session);
    schedule.set({ shiftDate: next.shiftDate, startTime: next.startTime, endTime: next.endTime });
    return schedule.save({ session });
  });
}

async function assignEmployee(scheduleId, employeeId) {
  const message = "Invalid schedule or employee ID.";
  requireId(scheduleId, message);
  requireId(employeeId, message);
  return mongoose.connection.transaction(async session => {
    const schedule = await Schedule.findById(scheduleId).session(session);
    if (!schedule) return null;
    const employee = await Employee.findById(employeeId).session(session);
    if (!employee) throw httpError(404, "Employee not found.");
    if (schedule.employees.some(id => id.equals(employee._id))) {
      throw httpError(409, "Employee already assigned.");
    }
    await validateAssignments(schedule, [employee._id], session);
    schedule.employees.push(employee._id);
    await schedule.save({ session });
    return schedule.populate({ path: "employees", options: { session } });
  });
}

async function publishSchedule(scheduleId) {
  requireId(scheduleId, "Invalid schedule ID.");
  return mongoose.connection.transaction(async session => {
    const schedule = await Schedule.findById(scheduleId).session(session);
    if (!schedule) return null;
    if (schedule.status === "published") throw httpError(409, "Schedule is already published.");
    if (!schedule.shiftDate) throw httpError(400, "Schedule information is incomplete.");
    validateTimes(schedule.startTime, schedule.endTime);
    await validateAssignments(schedule, schedule.employees, session);
    schedule.status = "published";
    schedule.publishedAt = new Date();
    return schedule.save({ session });
  });
}

async function removeEmployee(scheduleId, employeeId) {
  const message = "Invalid schedule or employee ID.";
  requireId(scheduleId, message);
  requireId(employeeId, message);
  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) return null;
  const targetId = new mongoose.Types.ObjectId(employeeId);
  const assigned = schedule.employees.filter(id => !id.equals(targetId));
  if (assigned.length === schedule.employees.length) {
    throw httpError(409, "Employee is not assigned to this shift.");
  }
  schedule.employees = assigned;
  await schedule.save();
  return schedule.populate("employees");
}

async function getAvailableEmployees(scheduleId) {
  requireId(scheduleId, "Invalid schedule ID.");
  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) throw httpError(404, "Schedule not found.");
  const available = await Availability.distinct("employee", availabilityFilter(schedule));
  const assigned = new Set(schedule.employees.map(id => id.toString()));
  const candidates = available.filter(id => !assigned.has(id.toString()));
  if (!candidates.length) return [];
  const busy = await Schedule.distinct("employees", {
    ...conflictFilter(schedule), employees: { $in: candidates }
  });
  const busyIds = new Set(busy.map(id => id.toString()));
  return Employee.find({ _id: { $in: candidates.filter(id => !busyIds.has(id.toString())) } })
    .sort({ name: 1 });
}

module.exports = {
  createSchedule, createWeeklySchedule, getAllSchedules, updateSchedule,
  assignEmployee, publishSchedule, removeEmployee, getAvailableEmployees
};
