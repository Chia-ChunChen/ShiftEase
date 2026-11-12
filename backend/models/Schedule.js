
const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    shiftDate: {
      type: Date,
      required: true
    },

    startTime: {
      type: String,
      required: true
    },

    endTime: {
      type: String,
      required: true
    },

    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee"
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
