
const Availability = require("../models/Availability");

// Register Employee model for populate()
require("../models/Employee");

// Get all employee availability records
const getAllAvailability = async () => {
  const availability = await Availability.find()
    .populate("employee", "name email position")
    .sort({ availableDate: 1, startTime: 1 });

  return availability;
};

module.exports = {
  getAllAvailability
};
