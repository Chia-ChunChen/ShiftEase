
const express = require("express");
const router = express.Router();

const {
  getAllEmployees,
  getMyEmployeeProfile,
  getEmployeeProfile,
  updateEmployeeProfile
} = require("../controllers/employeeController");

const {
  authenticateUser,
  authorizeRoles
} = require("../middleware/authMiddleware");

// All routes require login
router.use(authenticateUser);

// Employee gets own profile
router.get(
  "/me",
  authorizeRoles("Employee"),
  getMyEmployeeProfile
);

// Only Administrator and Manager can view all employees
router.get(
  "/",
  authorizeRoles("Administrator", "Manager"),
  getAllEmployees
);

// Only Administrator and Manager can view employee by ID
router.get(
  "/:id",
  authorizeRoles("Administrator", "Manager"),
  getEmployeeProfile
);

// Only Administrator and Manager can update employee
router.put(
  "/:id",
  authorizeRoles("Administrator", "Manager"),
  updateEmployeeProfile
);

module.exports = router;
