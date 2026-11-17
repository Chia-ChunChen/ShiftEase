
const mongoose = require("mongoose");
const Availability = require("../models/Availability");
const Employee = require("../models/Employee");
const httpError = require("../lib/httpError");

function normalizeDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error("Invalid availability date.");
    error.code = "INVALID_AVAILABILITY";
    throw error;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function createAvailability({
  employee,
  availableDate,
  startTime,
  endTime
}, session) {
  if (!mongoose.isValidObjectId(employee)) {
    const error = new Error("A valid employee ID is required.");
    error.code = "INVALID_AVAILABILITY";
    throw error;
  }

  if (typeof availableDate !== "string" && !(availableDate instanceof Date)) {
    throw httpError(400, "An availability date is required.");
  }
  const date = normalizeDate(availableDate);
  if (typeof availableDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(availableDate) &&
      date.toISOString().slice(0, 10) !== availableDate) {
    throw httpError(400, "Invalid availability date.");
  }
  if (!(await Employee.exists({ _id: employee }).session(session ?? null))) {
    throw httpError(404, "Employee not found.");
  }

  const entry = new Availability({
    employee,
    availableDate: date,
    startTime,
    endTime
  });

  await entry.validate();

  const overlap = await Availability.exists({
    employee,
    availableDate: date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  }).session(session ?? null);

  if (overlap) {
    const error = new Error(
      "Availability overlaps an existing time slot."
    );
    error.code = "OVERLAPPING_AVAILABILITY";
    throw error;
  }

  return entry.save({ session });
}

// Get all employee availability records
const getAllAvailability = async employee => {
  const query = Availability.find(employee ? { employee } : {});
  if (!employee) query.populate("employee", "name email position");
  const availability = await query
    .sort({ availableDate: 1, startTime: 1 });

  return availability;
};

async function createWeeklyAvailability(employee, entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 7) {
    throw httpError(400, "Select one to seven dates.");
  }
  await Availability.init();
  return mongoose.connection.transaction(async session => {
    const employeeLock = await Employee.updateOne(
      { _id: employee },
      { $inc: { availabilityRevision: 1 } },
      { session, timestamps: false }
    );
    if (!employeeLock.matchedCount) throw httpError(404, "Employee not found.");
    const saved = [];
    for (const entry of entries) {
      saved.push(await createAvailability({ ...entry, employee }, session));
    }
    return saved;
  });
}

module.exports = { createAvailability, createWeeklyAvailability, getAllAvailability };
