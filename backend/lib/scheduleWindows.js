function mergeWindows(windows) {
  const sorted = windows.filter(window => window && typeof window.startTime === 'string' &&
    typeof window.endTime === 'string' && window.startTime < window.endTime)
    .map(({ startTime, endTime }) => ({ startTime, endTime }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const merged = [];
  for (const window of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && window.startTime <= previous.endTime) {
      if (window.endTime > previous.endTime) previous.endTime = window.endTime;
    } else merged.push(window);
  }
  return merged;
}

function subtractWindows(windows, busy) {
  let result = mergeWindows(windows);
  for (const blocked of mergeWindows(busy)) {
    result = result.flatMap(window => {
      if (blocked.startTime >= window.endTime || blocked.endTime <= window.startTime) return [window];
      const parts = [];
      if (blocked.startTime > window.startTime) parts.push({ startTime: window.startTime, endTime: blocked.startTime });
      if (blocked.endTime < window.endTime) parts.push({ startTime: blocked.endTime, endTime: window.endTime });
      return parts;
    });
  }
  return result;
}

function overlaps(a, b) { return a.startTime < b.endTime && a.endTime > b.startTime; }
const employeeId = value => String(value?._id ?? value);

function assignmentsFor(schedule) {
  if (Array.isArray(schedule.assignments)) return schedule.assignments;
  return (schedule.employees ?? []).map(employee => ({
    _id: 'legacy:' + employeeId(employee), employee,
    startTime: schedule.startTime, endTime: schedule.endTime, followsDayHours: false
  }));
}

function coverageFor(schedule, assignments = assignmentsFor(schedule)) {
  const boundaries = [...new Set([schedule.startTime, schedule.endTime,
    ...assignments.flatMap(assignment => [assignment.startTime, assignment.endTime])])]
    .filter(time => time >= schedule.startTime && time <= schedule.endTime).sort();
  return boundaries.slice(0, -1).map((startTime, index) => {
    const endTime = boundaries[index + 1];
    const ids = new Set(assignments.filter(assignment => assignment.startTime <= startTime &&
      assignment.endTime >= endTime).map(assignment => employeeId(assignment.employee)));
    return { startTime, endTime, employeeCount: ids.size };
  });
}

module.exports = { mergeWindows, subtractWindows, overlaps, employeeId, assignmentsFor, coverageFor };
