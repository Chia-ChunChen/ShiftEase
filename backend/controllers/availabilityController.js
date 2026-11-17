
const { createAvailability, getAllAvailability: listAvailability } =
  require("../services/availabilityService");

const createAvailabilityController = async (req, res) => {
  try {
    const {
      employee,
      availableDate,
      startTime,
      endTime
    } = req.body;

    // Check required fields
    if (!employee || !availableDate || !startTime || !endTime) {
      return res.status(400).json({
        message: "All availability fields are required."
      });
    }

    // Save availability using database service
    const availability = await createAvailability({
      employee,
      availableDate,
      startTime,
      endTime
    });

    return res.status(201).json({
      message: "Availability created successfully.",
      availability
    });

  } catch (error) {
    // Overlapping time slots
    if (error.code === "OVERLAPPING_AVAILABILITY") {
      return res.status(409).json({
        message: error.message
      });
    }

    // Invalid date or employee ID
    if (
      error.code === "INVALID_AVAILABILITY" ||
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        message: error.message
      });
    }

    console.error("Create availability error:", error);

    return res.status(500).json({
      message: "Unable to create availability."
    });
  }
};

const getAllAvailability = async (req, res) => {
  try {
    // Get availability data from service
    const availability =
      await listAvailability();

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

module.exports = { createAvailabilityController, getAllAvailability };
