const mongoose = require("mongoose");

const windowSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
}, { _id: false });

const daySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
  windows: { type: [windowSchema], required: true }
}, { _id: false });

const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  clientRequestId: { type: String, required: true },
  periodStart: { type: String, required: true },
  days: { type: [daySchema], required: true },
  status: { type: String, enum: ["pending", "approved"], default: "pending", required: true },
  submittedAt: { type: Date, default: Date.now, required: true },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

schema.index({ employee: 1, clientRequestId: 1 }, { unique: true });
schema.index({ employee: 1, status: 1, periodStart: -1, approvedAt: -1 });
schema.index({ status: 1, submittedAt: 1 });

module.exports = mongoose.model("AvailabilityRequest", schema);
