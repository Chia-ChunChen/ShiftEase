
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    mustChangePassword: {
      type: Boolean,
      default: false
    },

    sessionVersion: {
      type: Number,
      default: 0
    },

    role: {
      type: String,
      enum: ["Administrator", "Manager", "Employee"],
      required: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.sessionVersion;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);
