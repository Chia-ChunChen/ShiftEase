
const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  // Legacy API clients assign the entire day; keep that behavior when they edit its hours.
  followsDayHours: { type: Boolean, default: false }
});

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


  assignments: { type: [assignmentSchema], default: undefined },
  employees: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  }
],

  status: {
  type: String,
  enum: ["draft", "published"],
  default: "draft"
},

  publishedAt: {
  type: Date,
  default: null
}

  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
