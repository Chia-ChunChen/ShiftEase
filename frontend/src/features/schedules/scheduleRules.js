export function validHours(hours) {
  const pattern = /^([01]\d|2[0-3]):[0-5]\d$/
  return Boolean(hours && pattern.test(hours.startTime) && pattern.test(hours.endTime) && hours.startTime < hours.endTime)
}

export function copyDayHours(hours, source, targets, overwrite = false) {
  if (!validHours(hours[source])) throw new Error('Enter valid work hours on the source day first.')
  const dates = [...new Set(targets)].filter(date => date !== source)
  if (!dates.length) throw new Error('Choose at least one other date.')
  const occupied = dates.filter(date => hours[date]?.startTime || hours[date]?.endTime)
  if (occupied.length && !overwrite) {
    throw new Error(`${occupied.join(', ')} already has draft hours. Select Replace existing draft hours to overwrite them.`)
  }
  const result = { ...hours }
  for (const date of dates) result[date] = { startTime: hours[source].startTime, endTime: hours[source].endTime }
  return result
}

export function filterUnsavedScheduleEntries(entries, schedules) {
  const savedDates = new Set(schedules.map(day => String(day.shiftDate).slice(0, 10)))
  return entries.filter(entry => !savedDates.has(entry.shiftDate))
}

export function minutes(time) {
  const [hours, value] = time.split(':').map(Number)
  return hours * 60 + value
}
