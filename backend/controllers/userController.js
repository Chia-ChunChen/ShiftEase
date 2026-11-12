const { createUser } = require("../services/userService");

const createUserController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    // Public registration only creates Employee accounts.
    // Administrator and Manager roles must be assigned through
    // an authorized account-management workflow.
    const user = await createUser({
      name,
      email,
      password,
      role: "Employee"
    });

    return res.status(201).json({
      message: "User created successfully.",
      user
    });

  } catch (error) {
    if (error.code === "DUPLICATE_EMAIL") {
      return res.status(409).json({
        message: error.message
      });
    }

    if (error.code === "INVALID_PASSWORD") {
      return res.status(400).json({
        message: error.message
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message
      });
    }

    console.error("Create user error:", error);

    return res.status(500).json({
      message: "Unable to create user."
    });
  }
};

module.exports = { createUserController };
