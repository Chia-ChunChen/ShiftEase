const httpError = require("./httpError");

const NOTICE_MS = 192 * 60 * 60 * 1000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const torontoParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

function parts(date) {
  return Object.fromEntries(torontoParts.formatToParts(date).map(({ type, value }) => [type, value]));
}

function torontoToday(now = new Date()) {
  const value = parts(now);
  return `${value.year}-${value.month}-${value.day}`;
}

function torontoMidnight(key) {
  const [year, month, day] = key.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  for (let index = 0; index < 4; index += 1) {
    const value = parts(new Date(instant));
    instant += target - Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day),
      Number(value.hour), Number(value.minute), Number(value.second));
  }
  return instant;
}

function normalizeRequest(body) {
  const { periodStart, days, clientRequestId } = body ?? {};
  if (typeof clientRequestId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(clientRequestId)) {
    throw httpError(400, "A valid client request ID is required.");
  }
  if (typeof periodStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) {
    throw httpError(400, "Invalid start date. Use YYYY-MM-DD.");
  }
  const date = new Date(periodStart + "T00:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== periodStart) {
    throw httpError(400, "Invalid start date.");
  }
  if (!Array.isArray(days) || days.length !== 7) {
    throw httpError(400, "Include each day of the week exactly once.");
  }
  const seen = new Set();
  const normalizedDays = days.map(day => {
    if (!day || !Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 1 || day.dayOfWeek > 7 ||
        seen.has(day.dayOfWeek) || !Array.isArray(day.windows)) {
      throw httpError(400, "Include each day of the week exactly once with its time windows.");
    }
    seen.add(day.dayOfWeek);
    const windows = day.windows.map(window => {
      if (!window || typeof window.startTime !== "string" || typeof window.endTime !== "string" ||
          !TIME.test(window.startTime) || !(TIME.test(window.endTime) || window.endTime === "24:00") ||
          window.endTime <= window.startTime) {
        throw httpError(400, "Invalid time window. End time must follow start time; midnight may end at 24:00.");
      }
      return { startTime: window.startTime, endTime: window.endTime };
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (windows.some((window, index) => index > 0 && window.startTime < windows[index - 1].endTime)) {
      throw httpError(400, "Availability windows cannot overlap.");
    }
    return { dayOfWeek: day.dayOfWeek, windows };
  }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return { periodStart, days: normalizedDays, clientRequestId };
}

function requireNotice(periodStart, now = Date.now()) {
  if (torontoMidnight(periodStart) - now < NOTICE_MS) {
    throw httpError(400, "Please select a start date at least 8 days from now (Toronto time).");
  }
}

function coversShift(days, shift) {
  const dayOfWeek = new Date(shift.shiftDate).getUTCDay() || 7;
  const windows = days.find(day => day.dayOfWeek === dayOfWeek)?.windows ?? [];
  let coveredUntil = shift.startTime;
  for (const window of windows) {
    if (window.startTime > coveredUntil) break;
    if (window.endTime > coveredUntil) coveredUntil = window.endTime;
    if (coveredUntil >= shift.endTime) return true;
  }
  return false;
}

module.exports = { normalizeRequest, requireNotice, torontoToday, torontoMidnight, coversShift };
