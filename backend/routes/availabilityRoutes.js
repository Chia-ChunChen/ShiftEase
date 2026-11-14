
const express = require("express");
const router = express.Router();

const availabilityController = require("../controllers/availabilityController");

// Get all employee availability
router.get("/", availabilityController.getAllAvailability);

module.exports = router;
