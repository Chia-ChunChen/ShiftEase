
const scheduleService = require("../services/scheduleService");

// Create a new schedule
const createSchedule = async (req, res) => {
  try {
    // Get data from request body
    const scheduleData = req.body;

    // Call the service to create a schedule
    const newSchedule = await scheduleService.createSchedule(
      scheduleData
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: "Schedule created successfully.",
      data: newSchedule
    });

  } catch (error) {
    const validationMessages = [
      "All fields are required.",
      "Invalid date format. Use YYYY-MM-DD.",
      "Invalid shift date.",
      "Invalid time format. Use HH:mm.",
      "End time must be after start time."
    ];

    if (validationMessages.includes(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Create schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create schedule."
    });
  }
};


 // Get all schedules
const getAllSchedules = async (req, res) => {
  try {
    const schedules = await scheduleService.getAllSchedules();

    res.status(200).json({
      success: true,
      message: "Schedules retrieved successfully.",
      data: schedules
    });

  } catch (error) {
    console.error("Get schedules error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve schedules."
    });
  }
};


 // Update an existing schedule
const updateSchedule = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const updateData = req.body;

    const updatedSchedule =
      await scheduleService.updateSchedule(
        scheduleId,
        updateData
      );

    // Schedule not found
    if (!updatedSchedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found."
      });
    }

    // Return updated schedule
    res.status(200).json({
      success: true,
      message: "Schedule updated successfully.",
      data: updatedSchedule
    });

  } catch (error) {
    // Invalid MongoDB ID
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule ID."
      });
    }

    const validationMessages = [
      "No schedule fields provided.",
      "Invalid date format. Use YYYY-MM-DD.",
      "Invalid shift date.",
      "Invalid time format. Use HH:mm.",
      "End time must be after start time."
    ];

    if (validationMessages.includes(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Update schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update schedule."
    });
  }
};


 // Assign an employee to a schedule
const assignEmployee = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const { employeeId } = req.body;

    // Check required field
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required."
      });
    }

    // Call service
    const updatedSchedule =
      await scheduleService.assignEmployee(
        scheduleId,
        employeeId
      );

    // Schedule not found
    if (!updatedSchedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found."
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: "Employee assigned successfully.",
      data: updatedSchedule
    });

  } catch (error) {
    if (
      error.message === "Invalid schedule or employee ID."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === "Employee not found.") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (
    error.message === "Employee already assigned." ||
    error.message === "Employee has a conflicting shift." ||
    error.message === "Employee is not available for this shift."
){
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    console.error("Assign employee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to assign employee."
    });
  }
};


 // Publish a schedule
const publishSchedule = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    // Call service
    const publishedSchedule =
      await scheduleService.publishSchedule(scheduleId);

    // Schedule not found
    if (!publishedSchedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found."
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: "Schedule published successfully.",
      data: publishedSchedule
    });

  } catch (error) {
    // Invalid Schedule ID
    if (error.message === "Invalid schedule ID.") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Schedule already published
    if (error.message === "Schedule is already published.") {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    // Invalid schedule information
    if (
      error.message === "Schedule information is incomplete." ||
      error.message === "Invalid schedule time range."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Publish schedule error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to publish schedule."
    });
  }
};


 // Remove an employee from a schedule
const removeEmployee = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const employeeId = req.params.employeeId;

    // Call service
    const updatedSchedule =
      await scheduleService.removeEmployee(
        scheduleId,
        employeeId
      );

    // Schedule not found
    if (!updatedSchedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found."
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: "Employee removed successfully.",
      data: updatedSchedule
    });

  } catch (error) {
    // Invalid ID
    if (
      error.message === "Invalid schedule or employee ID."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Employee not assigned
    if (
      error.message ===
      "Employee is not assigned to this shift."
    ) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    console.error("Remove employee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove employee."
    });
  }
};

 // Get available employees for a schedule
const getAvailableEmployees = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    // Call service
    const employees =
      await scheduleService.getAvailableEmployees(scheduleId);

    // Return available employees
    res.status(200).json({
      success: true,
      message: "Available employees retrieved successfully.",
      data: employees
    });

  } catch (error) {
    // Invalid Schedule ID
    if (error.message === "Invalid schedule ID.") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Schedule not found
    if (error.message === "Schedule not found.") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    console.error("Get available employees error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve available employees."
    });
  }
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