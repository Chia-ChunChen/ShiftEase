const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const Employee = require('../models/Employee');
const { availableEmployeeIds, availableEmployeeWindows } = require('./availabilityRequestService');
const { assignmentsFor, coverageFor, employeeId, overlaps, subtractWindows } = require('../lib/scheduleWindows');
const httpError = require('../lib/httpError');
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function requireId(id, message = 'Invalid schedule or employee ID.') {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, message);
}
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw httpError(400, 'Use YYYY-MM-DD for the date.');
  const date = new Date(value + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw httpError(400, 'Invalid work date.');
  return date;
}
function validateTimes(startTime, endTime) {
  if (typeof startTime !== 'string' || typeof endTime !== 'string' || !TIME.test(startTime) || !TIME.test(endTime)) {
    throw httpError(400, 'Enter valid times in HH:mm format.');
  }
  if (endTime <= startTime) throw httpError(400, 'End time must be after start time.');
}
function newDay(data) {
  const { shiftDate, startTime, endTime } = data ?? {};
  validateTimes(startTime, endTime);
  return { shiftDate: parseDate(shiftDate), startTime, endTime, employees: [], assignments: [] };
}
function dayRange(value) {
  const start = new Date(value); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  return { $gte: start, $lt: end };
}
function present(schedule) {
  if (!schedule) return null;
  const result = typeof schedule.toObject === 'function' ? schedule.toObject() : schedule;
  return { ...result, id: String(result._id), assignments: assignmentsFor(result), coverage: coverageFor(result) };
}
async function populated(schedule, session) {
  await schedule.populate({ path: 'employees', options: { session } });
  await schedule.populate({ path: 'assignments.employee', options: { session } });
  return present(schedule);
}
function materialize(schedule) {
  if (schedule.assignments === undefined) {
    schedule.assignments = assignmentsFor(schedule).map(({ employee, startTime, endTime, followsDayHours }) =>
      ({ employee: employeeId(employee), startTime, endTime, followsDayHours }));
  }
}
function synchronize(schedule) {
  schedule.employees = [...new Set(schedule.assignments.map(item => employeeId(item.employee)))];
  schedule.status = 'draft'; schedule.publishedAt = null;
}
async function lockEmployees(ids, session) {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const result = await Employee.updateMany({ _id: { $in: unique } }, { $inc: { scheduleRevision: 1 } }, { session, timestamps: false });
  if (result.matchedCount !== unique.length) throw httpError(409, 'An assigned employee no longer exists.');
}
async function validateAssignments(day, assignments, session) {
  await lockEmployees(assignments.map(item => employeeId(item.employee)), session);
  const others = await Schedule.find({ _id: { $ne: day._id }, shiftDate: dayRange(day.shiftDate) }).session(session).lean();
  const busy = others.flatMap(assignmentsFor);
  for (let index = 0; index < assignments.length; index++) {
    const item = assignments[index];
    const id = employeeId(item.employee);
    validateTimes(item.startTime, item.endTime);
    if (item.startTime < day.startTime || item.endTime > day.endTime) {
      throw httpError(409, 'An employee shift is outside the day\'s work hours. Adjust that shift first.');
    }
    if (assignments.slice(0, index).some(other => employeeId(other.employee) === id && overlaps(item, other)) ||
        busy.some(other => employeeId(other.employee) === id && overlaps(item, other))) {
      throw httpError(409, 'This employee already has an overlapping shift.');
    }
    const available = await availableEmployeeIds({ shiftDate: day.shiftDate, startTime: item.startTime, endTime: item.endTime }, [id], session);
    if (!available.length) throw httpError(409, 'This employee is not available for the selected personal shift.');
  }
}
async function createSchedule(data) { return present(await Schedule.create(newDay(data))); }
async function createWeeklySchedule(entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 7) throw httpError(400, 'Select one to seven dates.');
  const days = entries.map(newDay);
  if (new Set(days.map(day => day.shiftDate.getTime())).size !== days.length) throw httpError(400, 'Enter one work period per date in the weekly form.');
  await Schedule.init();
  const saved = await mongoose.connection.transaction(session => Schedule.insertMany(days, { session }));
  return saved.map(present);
}
async function getAllSchedules() {
  const schedules = await Schedule.find().populate('employees').populate('assignments.employee').sort({ shiftDate: 1, startTime: 1 });
  return schedules.map(present);
}
async function updateSchedule(id, data) {
  requireId(id);
  const { shiftDate, startTime, endTime } = data ?? {};
  if ([shiftDate, startTime, endTime].every(value => value === undefined)) throw httpError(400, 'Provide the day\'s date or work hours.');
  return mongoose.connection.transaction(async session => {
    const day = await Schedule.findById(id).session(session);
    if (!day) return null;
    materialize(day);
    day.set({ shiftDate: shiftDate === undefined ? day.shiftDate : parseDate(shiftDate),
      startTime: startTime ?? day.startTime, endTime: endTime ?? day.endTime });
    validateTimes(day.startTime, day.endTime);
    for (const item of day.assignments) {
      if (item.followsDayHours) { item.startTime = day.startTime; item.endTime = day.endTime; }
    }
    await validateAssignments(day, day.assignments, session);
    synchronize(day); await day.save({ session });
    return populated(day, session);
  });
}
async function assignEmployee(id, targetEmployee, times = {}) {
  requireId(id); requireId(targetEmployee);
  return mongoose.connection.transaction(async session => {
    const day = await Schedule.findById(id).session(session);
    if (!day) return null;
    if (!await Employee.exists({ _id: targetEmployee }).session(session)) throw httpError(404, 'Employee not found.');
    materialize(day);
    const followsDayHours = times.startTime === undefined && times.endTime === undefined;
    const item = { employee: targetEmployee, startTime: followsDayHours ? day.startTime : times.startTime,
      endTime: followsDayHours ? day.endTime : times.endTime, followsDayHours };
    validateTimes(item.startTime, item.endTime);
    day.assignments.push(item);
    await validateAssignments(day, day.assignments, session);
    synchronize(day); await day.save({ session });
    return populated(day, session);
  });
}
function assignmentIndex(day, assignmentId) {
  const index = assignmentsFor(day).findIndex(item => String(item._id) === assignmentId);
  if (index < 0) throw httpError(404, 'Employee shift not found. Refresh the day and try again.');
  return index;
}
async function updateAssignment(id, assignmentId, times) {
  requireId(id);
  validateTimes(times?.startTime, times?.endTime);
  return mongoose.connection.transaction(async session => {
    const day = await Schedule.findById(id).session(session);
    if (!day) return null;
    const index = assignmentIndex(day, assignmentId);
    materialize(day);
    day.assignments[index].set({ startTime: times.startTime, endTime: times.endTime, followsDayHours: false });
    await validateAssignments(day, day.assignments, session);
    synchronize(day); await day.save({ session });
    return populated(day, session);
  });
}
async function removeAssignment(id, assignmentId) {
  requireId(id);
  return mongoose.connection.transaction(async session => {
    const day = await Schedule.findById(id).session(session);
    if (!day) return null;
    const index = assignmentIndex(day, assignmentId);
    materialize(day);
    await lockEmployees(day.assignments.map(item => employeeId(item.employee)), session);
    day.assignments.splice(index, 1);
    synchronize(day); await day.save({ session });
    return populated(day, session);
  });
}
async function removeEmployee(id, targetEmployee) {
  requireId(id); requireId(targetEmployee);
  return mongoose.connection.transaction(async session => {
    const day = await Schedule.findById(id).session(session);
    if (!day) return null;
    materialize(day);
    if (!day.assignments.some(item => employeeId(item.employee) === targetEmployee)) throw httpError(409, 'Employee is not assigned to this day.');
    await lockEmployees([targetEmployee], session);
    day.assignments = day.assignments.filter(item => employeeId(item.employee) !== targetEmployee);
    synchronize(day); await day.save({ session });
    return populated(day, session);
  });
}
async function publishSchedule(id) {
  requireId(id);
  return mongoose.connection.transaction(async session => {
    const day = await Schedule.findById(id).session(session);
    if (!day) return null;
    if (day.status === 'published') throw httpError(409, 'Schedule is already published.');
    materialize(day);
    if (!day.assignments.length) throw httpError(400, 'Assign at least one employee before publishing.');
    await validateAssignments(day, day.assignments, session);
    day.status = 'published'; day.publishedAt = new Date();
    await day.save({ session });
    return populated(day, session);
  });
}
async function getAvailableEmployees(id) {
  requireId(id);
  const day = await Schedule.findById(id);
  if (!day) throw httpError(404, 'Schedule not found.');
  const availability = await availableEmployeeWindows(day);
  const schedules = await Schedule.find({ shiftDate: dayRange(day.shiftDate) }).lean();
  const assigned = schedules.flatMap(assignmentsFor);
  const windows = new Map();
  for (const record of availability) {
    const employee = employeeId(record.employee);
    const clipped = record.windows.map(window => ({ startTime: window.startTime < day.startTime ? day.startTime : window.startTime,
      endTime: window.endTime > day.endTime ? day.endTime : window.endTime }));
    const free = subtractWindows(clipped, assigned.filter(item => employeeId(item.employee) === employee));
    if (free.length) windows.set(employee, free);
  }
  const employees = await Employee.find({ _id: { $in: [...windows.keys()] } }).sort({ name: 1 }).lean();
  return employees.map(employee => ({ ...employee, id: String(employee._id), availableWindows: windows.get(String(employee._id)) }));
}
module.exports = { createSchedule, createWeeklySchedule, getAllSchedules, updateSchedule, assignEmployee,
  updateAssignment, removeAssignment, publishSchedule, removeEmployee, getAvailableEmployees };
