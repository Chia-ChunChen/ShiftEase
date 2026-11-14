
const mongoose = require("mongoose");
const Availability = require("../models/Availability");

function normalizeDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error("Invalid availability date.");
    error.code = "INVALID_AVAILABILITY";
    throw error;
  }

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

async function createAvailability({
  employee,
  availableDate,
  startTime,
  endTime
}) {
  if (!mongoose.isValidObjectId(employee)) {
    const error = new Error("A valid employee ID is required.");
    error.code = "INVALID_AVAILABILITY";
    throw error;
  }

  const date = normalizeDate(availableDate);

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
  });

  if (overlap) {
    const error = new Error(
      "Availability overlaps an existing time slot."
    );
    error.code = "OVERLAPPING_AVAILABILITY";
    throw error;
  }

  return entry.save();
}

module.exports = { createAvailability };
