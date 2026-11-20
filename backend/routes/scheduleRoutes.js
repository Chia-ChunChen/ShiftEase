
const express = require("express");
const router = express.Router();

const scheduleController = require("../controllers/scheduleController");
const { requireSession, allowRoles } = require("../middleware/auth");

router.use(requireSession, allowRoles("Manager", "Administrator"));

// Create a schedule
router.post("/", scheduleController.createSchedule);
router.post("/weekly", scheduleController.createWeeklySchedule);

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
router.put('/:id/assignments/:assignmentId', scheduleController.updateAssignment);
router.delete('/:id/assignments/:assignmentId', scheduleController.removeAssignment);

// Remove an employee
router.delete(
  "/:id/employees/:employeeId",
  scheduleController.removeEmployee
);

// Publish a schedule
router.put("/:id/publish", scheduleController.publishSchedule);

module.exports = router;
