
const availabilityService = require("../services/availabilityService");

// Get all employee availability records
const getAllAvailability = async (req, res) => {
  try {
    // Get availability data from service
    const availability =
      await availabilityService.getAllAvailability();

    // Return success response
    res.status(200).json({
      success: true,
      message: "Availability retrieved successfully.",
      data: availability
    });

  } catch (error) {
    console.error("Get availability error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve availability."
    });
  }
};

module.exports = {
  getAllAvailability
};
