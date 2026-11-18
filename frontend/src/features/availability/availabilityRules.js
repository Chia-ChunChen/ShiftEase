export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7]

export const NOTICE_MS = 192 * 60 * 60 * 1000

const torontoParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function torontoToday(now = new Date()) {
  const parts = Object.fromEntries(
    torontoParts.formatToParts(now).map(({ type, value }) => [type, value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function torontoMidnight(key) {
  const [year, month, day] = key.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  let instant = target

  for (let index = 0; index < 4; index += 1) {
    const parts = Object.fromEntries(
      torontoParts
        .formatToParts(new Date(instant))
        .map(({ type, value }) => [type, value]),
    )

    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )

    instant += target - represented
  }

  return instant
}

export function validStart(key, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false

  const date = new Date(`${key}T12:00:00Z`)

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== key
  ) {
    return false
  }

  return torontoMidnight(key) - now >= NOTICE_MS
}

export function earliestStart(now = Date.now()) {
  const date = new Date(`${torontoToday(new Date(now))}T12:00:00Z`)

  for (let index = 0; index < 20; index += 1) {
    const key = date.toISOString().slice(0, 10)

    if (validStart(key, now)) return key

    date.setUTCDate(date.getUTCDate() + 1)
  }

  throw new Error('Unable to calculate the next available start date.')
}

export function blankTime() {
  return { hour: '', minute: '', period: 'AM' }
}

export function blankWindow() {
  return { from: blankTime(), to: blankTime() }
}

export function blankWeek() {
  return DAYS.map(() => [])
}

function timeMinutes(time, isEnd) {
  if (
    !/^(0?[1-9]|1[0-2])$/.test(time.hour) ||
    !/^[0-5]\d$/.test(time.minute) ||
    !['AM', 'PM'].includes(time.period)
  ) {
    return null
  }

  const hour =
    (Number(time.hour) % 12) + (time.period === 'PM' ? 12 : 0)

  const result = hour * 60 + Number(time.minute)

  return isEnd && result === 0 ? 1440 : result
}

function clock(minutes) {
  return [
    String(Math.floor(minutes / 60)).padStart(2, '0'),
    String(minutes % 60).padStart(2, '0'),
  ].join(':')
}

export function buildDays(week) {
  return week.map((windows, day) => {
    const normalized = windows
      .map((window) => {
        const start = timeMinutes(window.from, false)
        const end = timeMinutes(window.to, true)

        if (start === null || end === null) {
          throw new Error(
            `${DAYS[day]}: complete both times, including minutes.`,
          )
        }

        if (end <= start) {
          throw new Error(
            `${DAYS[day]}: To must be after From. Use 12:00 AM for the midnight ending this day.`,
          )
        }

        return { start, end }
      })
      .sort((a, b) => a.start - b.start)

    normalized.forEach((window, index) => {
      if (index > 0 && window.start < normalized[index - 1].end) {
        throw new Error(
          `${DAYS[day]}: availability windows cannot overlap.`,
        )
      }
    })

    return {
      dayOfWeek: DAY_NUMBERS[day],
      windows: normalized.map(({ start, end }) => ({
        startTime: clock(start),
        endTime: clock(end),
      })),
    }
  })
}

export function displayTime(value) {
  const [hour, minute] = value.split(':').map(Number)

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${
    hour >= 12 && hour < 24 ? 'PM' : 'AM'
  }`
}

export function displayDate(key) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}T12:00:00Z`))
}