const express = require("express");
const controller = require("../controllers/userController");
const { requireSession, allowRoles } = require("../middleware/auth");

const router = express.Router();
const adminOnly = allowRoles("Administrator");

router.post("/login", controller.login);
router.post("/logout", controller.logout);
router.get("/me", requireSession, controller.getProfile);
router.put("/me/password", requireSession, controller.updatePassword);
router.get("/", requireSession, adminOnly, controller.listAccounts);
router.post("/", requireSession, adminOnly, controller.createAccount);

module.exports = router;
