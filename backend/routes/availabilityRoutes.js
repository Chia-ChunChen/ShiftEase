const express = require("express");
const controller = require("../controllers/availabilityController");
const { requireSession, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.use(requireSession);
router.get("/current", allowRoles("Employee"), controller.getCurrentAvailability);
router.get("/requests/mine", allowRoles("Employee"), controller.getMyRequests);
router.post("/requests", allowRoles("Employee"), controller.submitRequest);
router.get("/requests", allowRoles("Administrator", "Manager"), controller.getRequests);
router.put("/requests/:id/approve", allowRoles("Administrator", "Manager"), controller.approveRequest);
router.get("/", allowRoles("Administrator", "Manager", "Employee"), controller.getAllAvailability);
router.post("/", allowRoles("Employee"), controller.createAvailabilityController);
router.post("/weekly", allowRoles("Employee"), controller.createWeeklyAvailability);

module.exports = router;
