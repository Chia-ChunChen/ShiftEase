
const express = require("express");
const router = express.Router();

const employeeController = require("../controllers/employeeController");

// Create a new employee
router.post("/", employeeController.createEmployee);

module.exports = router;
