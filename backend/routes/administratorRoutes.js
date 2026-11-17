
const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  createNewUser,
  updateUser,
  deleteUser
} = require("../controllers/administratorController");

const {
  authenticateUser,
  authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateUser);
router.use(authorizeRoles("Administrator"));

router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.post("/users", createNewUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

module.exports = router;
