const express = require("express");
const { createEmployee } = require("../controllers/employeeController");
const { requireSession, allowRoles } = require("../middleware/auth");

const router = express.Router();
router.post("/", requireSession, allowRoles("Manager", "Administrator"), createEmployee);
module.exports = router;
