
const express = require("express");

const {
  createUserController,
  loginUserController
} = require("../controllers/userController");

const router = express.Router();

// Register
router.post("/", createUserController);

// Login
router.post("/login", loginUserController);

module.exports = router;
