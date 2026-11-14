
const express = require("express");
const router = express.Router();

const scheduleController = require("../controllers/scheduleController");

// Create a schedule
router.post("/", scheduleController.createSchedule);

// Get all schedules
router.get("/", scheduleController.getAllSchedules);

// Get available employees for a schedule
router.get(
  "/:id/available-employees",
  scheduleController.getAvailableEmployees
);

// Update a schedule
router.put("/:id", scheduleController.updateSchedule);

// Assign an employee
router.put("/:id/employees", scheduleController.assignEmployee);

// Remove an employee
router.delete(
  "/:id/employees/:employeeId",
  scheduleController.removeEmployee
);

// Publish a schedule
router.put("/:id/publish", scheduleController.publishSchedule);

module.exports = router;
