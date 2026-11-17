
const express = require("express");

const {
  createAvailabilityController,
  getAllAvailability
} = require("../controllers/availabilityController");

const router = express.Router();

router.get("/", getAllAvailability);
router.post("/", createAvailabilityController);

module.exports = router;
