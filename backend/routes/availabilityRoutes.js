
const express = require("express");

const {
  createAvailabilityController
} = require("../controllers/availabilityController");

const router = express.Router();

router.post("/", createAvailabilityController);

module.exports = router;
