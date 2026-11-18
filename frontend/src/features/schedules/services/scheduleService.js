import {
  getJson,
  postJson,
  putJson,
  deleteJson,
} from '../../../shared/services/apiClient.js'

function schedulePath(scheduleId) {
  if (!scheduleId) {
    throw new Error('Select a saved shift first.')
  }

  return `/api/schedules/${encodeURIComponent(scheduleId)}`
}

function readSchedule(response) {
  const schedule = response?.data

  if (!schedule || typeof schedule._id !== 'string') {
    throw new Error(
      'The server did not return a valid shift. Reload the schedules before trying again.',
    )
  }

  return schedule
}

function readList(response) {
  if (!Array.isArray(response?.data)) {
    throw new Error('The server did not return a valid list.')
  }

  return response.data
}

function validateShift({ shiftDate, startTime, endTime }) {
  if (
    typeof shiftDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)
  ) {
    throw new Error('Select a valid shift date.')
  }

  const date = new Date(`${shiftDate}T00:00:00.000Z`)

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== shiftDate
  ) {
    throw new Error('Select a valid shift date.')
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

  if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
    throw new Error('Enter a start time and an end time.')
  }

  if (endTime <= startTime) {
    throw new Error('End time must be after start time.')
  }

  return { shiftDate, startTime, endTime }
}

export async function getSchedules(options = {}) {
  const response = await getJson('/api/schedules', options)
  return readList(response)
}

export async function createSchedule(shift) {
  const payload = validateShift(shift)
  const response = await postJson('/api/schedules', payload)
  return readSchedule(response)
}

export async function updateSchedule(scheduleId, shift) {
  const payload = validateShift(shift)
  const response = await putJson(schedulePath(scheduleId), payload)
  return readSchedule(response)
}

export async function getAvailableEmployees(scheduleId, options = {}) {
  const response = await getJson(
    `${schedulePath(scheduleId)}/available-employees`,
    options,
  )

  return readList(response)
}

export async function assignEmployee(scheduleId, employeeId) {
  if (!employeeId) {
    throw new Error('Select an employee to assign.')
  }

  const response = await putJson(
    `${schedulePath(scheduleId)}/employees`,
    { employeeId },
  )

  return readSchedule(response)
}

export async function removeEmployee(scheduleId, employeeId) {
  if (!employeeId) {
    throw new Error('Select an employee to remove.')
  }

  const response = await deleteJson(
    `${schedulePath(scheduleId)}/employees/${encodeURIComponent(employeeId)}`,
  )

  return readSchedule(response)
}

export async function publishSchedule(scheduleId) {
  const response = await putJson(
    `${schedulePath(scheduleId)}/publish`,
    {},
  )

  return readSchedule(response)
}