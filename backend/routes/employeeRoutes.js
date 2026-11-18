const express = require("express");
const controller = require("../controllers/employeeController");
const { requireSession, allowRoles } = require("../middleware/auth");

const router = express.Router();
const staff = allowRoles("Manager", "Administrator");

router.use(requireSession);
router.get("/me", allowRoles("Employee"), controller.getMyEmployeeProfile);
router.get("/", staff, controller.getAllEmployees);
router.get("/:id", staff, controller.getEmployeeProfile);
router.put("/:id", staff, controller.updateEmployeeProfile);
router.post("/", staff, controller.createEmployee);

module.exports = router;
