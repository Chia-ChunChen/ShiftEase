
const Schedule = require("../models/Schedule");
const Employee = require("../models/Employee");
const Availability = require("../models/Availability");
const mongoose = require("mongoose");

// Create a new schedule
const createSchedule = async (scheduleData) => {
  const { shiftDate, startTime, endTime } = scheduleData;

  // Check required fields
  if (!shiftDate || !startTime || !endTime) {
    throw new Error("All fields are required.");
  }

  // Validate date (YYYY-MM-DD)
  if (
    typeof shiftDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)
  ) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  const date = new Date(`${shiftDate}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== shiftDate
  ) {
    throw new Error("Invalid shift date.");
  }

  // Validate time (HH:mm)
  const timeFormat = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !timeFormat.test(startTime) ||
    !timeFormat.test(endTime)
  ) {
    throw new Error("Invalid time format. Use HH:mm.");
  }

  // End time must be after start time
  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }

  // Save schedule to MongoDB
  const newSchedule = await Schedule.create({
    shiftDate: date,
    startTime,
    endTime,
    employees: []
  });

  return newSchedule;
};


 // Get all schedules
const getAllSchedules = async () => {
  const schedules = await Schedule.find()
    .populate("employees")
    .sort({ shiftDate: 1, startTime: 1 });

  return schedules;
};



 // Update an existing schedule
const updateSchedule = async (scheduleId, updateData) => {
  const schedule = await Schedule.findById(scheduleId);

  if (!schedule) {
    return null;
  }

  const { shiftDate, startTime, endTime } = updateData;

  if (
    shiftDate === undefined &&
    startTime === undefined &&
    endTime === undefined
  ) {
    throw new Error("No schedule fields provided.");
  }

  // Update shift date
  if (shiftDate !== undefined) {
    if (
      typeof shiftDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)
    ) {
      throw new Error("Invalid date format. Use YYYY-MM-DD.");
    }

    const date = new Date(`${shiftDate}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== shiftDate
    ) {
      throw new Error("Invalid shift date.");
    }

    schedule.shiftDate = date;
  }

  // Validate time format
  const timeFormat = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (startTime !== undefined) {
    if (
      typeof startTime !== "string" ||
      !timeFormat.test(startTime)
    ) {
      throw new Error("Invalid time format. Use HH:mm.");
    }

    schedule.startTime = startTime;
  }

  if (endTime !== undefined) {
    if (
      typeof endTime !== "string" ||
      !timeFormat.test(endTime)
    ) {
      throw new Error("Invalid time format. Use HH:mm.");
    }

    schedule.endTime = endTime;
  }

  // Validate the updated time range
  if (schedule.endTime <= schedule.startTime) {
    throw new Error("End time must be after start time.");
  }

  // Save changes to MongoDB
  await schedule.save();

  return schedule;
};


 // Assign an employee to a schedule
const assignEmployee = async (scheduleId, employeeId) => {
  const mongoose = require("mongoose");

  // Validate IDs
  if (!mongoose.isValidObjectId(scheduleId) ||
      !mongoose.isValidObjectId(employeeId)) {
    throw new Error("Invalid schedule or employee ID.");
  }

  // Find schedule
  const schedule = await Schedule.findById(scheduleId);

  if (!schedule) {
    return null;
  }

  // Find employee
  const employee = await Employee.findById(employeeId);

  if (!employee) {
    throw new Error("Employee not found.");
  }

  // Prevent duplicate assignments
  const alreadyAssigned = schedule.employees.some(
    id => id.toString() === employeeId
  );

  if (alreadyAssigned) {
    throw new Error("Employee already assigned.");
  }

  // Check for overlapping shifts
  const conflictingSchedule = await Schedule.exists({
    _id: { $ne: schedule._id },
    shiftDate: schedule.shiftDate,
    employees: employee._id,
    startTime: { $lt: schedule.endTime },
    endTime: { $gt: schedule.startTime }
  });

  if (conflictingSchedule) {
    throw new Error("Employee has a conflicting shift.");
  }

 // Check employee availability before assignment
const availableEmployees =
  await getAvailableEmployees(scheduleId);

const isAvailable = availableEmployees.some(
  availableEmployee =>
    availableEmployee._id.toString() === employeeId
);

if (!isAvailable) {
  throw new Error(
    "Employee is not available for this shift."
  );
}


  // Assign employee
  schedule.employees.push(employee._id);

  // Save to MongoDB
  await schedule.save();

  return await schedule.populate("employees");
};


 // Publish a schedule
const publishSchedule = async (scheduleId) => {
  const mongoose = require("mongoose");

  // Validate schedule ID
  if (!mongoose.isValidObjectId(scheduleId)) {
    throw new Error("Invalid schedule ID.");
  }

  // Find schedule
  const schedule = await Schedule.findById(scheduleId);

  if (!schedule) {
    return null;
  }

  // Check if already published
  if (schedule.status === "published") {
    throw new Error("Schedule is already published.");
  }

  // Validate schedule information
  if (
    !schedule.shiftDate ||
    !schedule.startTime ||
    !schedule.endTime
  ) {
    throw new Error("Schedule information is incomplete.");
  }

  // Validate time range
  if (schedule.endTime <= schedule.startTime) {
    throw new Error("Invalid schedule time range.");
  }

  // Update publish status
  schedule.status = "published";
  schedule.publishedAt = new Date();

  // Save to MongoDB
  await schedule.save();

  return schedule;
};

 // Remove an employee from a schedule
const removeEmployee = async (scheduleId, employeeId) => {
  const mongoose = require("mongoose");

  // Validate IDs
  if (
    !mongoose.isValidObjectId(scheduleId) ||
    !mongoose.isValidObjectId(employeeId)
  ) {
    throw new Error("Invalid schedule or employee ID.");
  }

  // Find schedule
  const schedule = await Schedule.findById(scheduleId);

  if (!schedule) {
    return null;
  }

  // Check if employee is assigned
  const isAssigned = schedule.employees.some(
    id => id.toString() === employeeId
  );

  if (!isAssigned) {
    throw new Error("Employee is not assigned to this shift.");
  }

  // Remove employee
  schedule.employees = schedule.employees.filter(
    id => id.toString() !== employeeId
  );

  // Save changes
  await schedule.save();

  return await schedule.populate("employees");
};


 // Get employees available for a selected shift
const getAvailableEmployees = async (scheduleId) => {

  // Validate Schedule ID
  if (!mongoose.isValidObjectId(scheduleId)) {
    throw new Error("Invalid schedule ID.");
  }

  // Find selected schedule
  const schedule = await Schedule.findById(scheduleId);

  if (!schedule) {
    throw new Error("Schedule not found.");
  }

  // Calculate the selected UTC date range
  const startDate = new Date(schedule.shiftDate);
  startDate.setUTCHours(0, 0, 0, 0);

  const nextDate = new Date(startDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  // Find employees available during the entire shift
  const availabilityRecords = await Availability.find({
    availableDate: {
      $gte: startDate,
      $lt: nextDate
    },
    startTime: { $lte: schedule.startTime },
    endTime: { $gte: schedule.endTime }
  });

  const availableIds = [
    ...new Set(
      availabilityRecords
        .map(record => record.employee?.toString())
        .filter(Boolean)
    )
  ];

  if (availableIds.length === 0) {
    return [];
  }

  // Find conflicting schedules
  const conflictingSchedules = await Schedule.find({
    _id: { $ne: schedule._id },
    shiftDate: schedule.shiftDate,
    employees: { $in: availableIds },
    startTime: { $lt: schedule.endTime },
    endTime: { $gt: schedule.startTime }
  });

  const busyEmployeeIds = new Set(
    conflictingSchedules.flatMap(s =>
      s.employees.map(id => id.toString())
    )
  );

  const assignedEmployeeIds = new Set(
    schedule.employees.map(id => id.toString())
  );

  // Exclude busy or already assigned employees
  const eligibleIds = availableIds.filter(id =>
    !busyEmployeeIds.has(id) &&
    !assignedEmployeeIds.has(id)
  );

  // Return available employees
  return await Employee.find({
    _id: { $in: eligibleIds }
  }).sort({ name: 1 });
};


module.exports = {
  createSchedule,
  getAllSchedules,
  updateSchedule,
  assignEmployee,
  publishSchedule,
  removeEmployee,
  getAvailableEmployees
};