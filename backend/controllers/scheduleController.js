const scheduleService = require("../services/scheduleService");

function respond(operation, message, status = 200) {
  return async (req, res) => {
    try {
      const data = await operation(req);
      if (data === null) {
        return res.status(404).json({ success: false, message: "Schedule not found." });
      }
      return res.status(status).json({ success: true, message, data });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      if (error.name === "VersionError") {
        return res.status(409).json({
          success: false, message: "This schedule changed. Refresh it and try again."
        });
      }
      console.error("Schedule request failed:", error.name);
      return res.status(500).json({ success: false, message: "Unable to complete the schedule request." });
    }
  };
}

module.exports = {
  createSchedule: respond(req => scheduleService.createSchedule(req.body), "Schedule created successfully.", 201),
  createWeeklySchedule: respond(req => scheduleService.createWeeklySchedule(req.body?.entries), "Weekly schedule saved.", 201),
  getAllSchedules: respond(() => scheduleService.getAllSchedules(), "Schedules retrieved successfully."),
  updateSchedule: respond(req => scheduleService.updateSchedule(req.params.id, req.body), "Schedule updated successfully."),
  assignEmployee: respond(req => scheduleService.assignEmployee(req.params.id, req.body?.employeeId, req.body), "Employee shift added."),
  updateAssignment: respond(req => scheduleService.updateAssignment(req.params.id, req.params.assignmentId, req.body), "Employee shift updated."),
  removeAssignment: respond(req => scheduleService.removeAssignment(req.params.id, req.params.assignmentId), "Employee shift removed."),
  publishSchedule: respond(req => scheduleService.publishSchedule(req.params.id), "Schedule published successfully."),
  removeEmployee: respond(req => scheduleService.removeEmployee(req.params.id, req.params.employeeId), "Employee removed successfully."),
  getAvailableEmployees: respond(req => scheduleService.getAvailableEmployees(req.params.id), "Available employees retrieved successfully.")
};
