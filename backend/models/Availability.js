const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },

    availableDate: {
      type: Date,
      required: true
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
      validate: {
        validator: function (value) {
          if (!this.startTime || !value) {
            return true;
          }

          return value > this.startTime;
        },
        message: "End time must be later than start time."
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Availability",
  availabilitySchema
);
