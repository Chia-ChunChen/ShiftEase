const express = require("express");
const controller = require("../controllers/availabilityController");
const { requireSession, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.use(requireSession);
router.get("/", allowRoles("Administrator", "Manager", "Employee"), controller.getAllAvailability);
router.post("/", allowRoles("Employee"), controller.createAvailabilityController);
router.post("/weekly", allowRoles("Employee"), controller.createWeeklyAvailability);

module.exports = router;
