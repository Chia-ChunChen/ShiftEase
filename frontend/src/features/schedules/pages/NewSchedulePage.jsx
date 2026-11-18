import { useEffect, useRef, useState } from 'react'
import './NewSchedulePage.css'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import CalendarDatePicker from '../../../shared/components/CalendarDatePicker.jsx'
import {
  getSchedules,
  createSchedule,
  getAvailableEmployees,
  assignEmployee,
  removeEmployee,
} from '../services/scheduleService.js'

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getWeekDates(offset) {
  const today = new Date()
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7,
  )

  return Array.from(
    { length: 7 },
    (_, index) =>
      new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + index,
      ),
  )
}

function shiftDateKey(shift) {
  return String(shift.shiftDate).slice(0, 10)
}

function shiftLabel(shift) {
  const date = new Date(`${shiftDateKey(shift)}T00:00:00`)
  return `${dateFormatter.format(date)} · ${shift.startTime}–${shift.endTime}`
}

function NewSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDates, setSelectedDates] = useState([])
  const [shiftHours, setShiftHours] = useState({})
  const [calendarOpen, setCalendarOpen] = useState(false)

  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState('')

  const [available, setAvailable] = useState([])
  const [availableLoading, setAvailableLoading] = useState(false)
  const [availableError, setAvailableError] = useState('')
  const [availableVersion, setAvailableVersion] = useState(0)
  const [employeeId, setEmployeeId] = useState('')

  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [assignmentFeedback, setAssignmentFeedback] = useState(null)
  const [saveUncertain, setSaveUncertain] = useState(false)

  const calendarButtonRef = useRef(null)
  const operationRef = useRef(false)

  const weekDates = getWeekDates(weekOffset)
  const weekStart = getDateKey(weekDates[0])
  const weekEnd = getDateKey(weekDates[6])

  const weeklySchedules = schedules
    .filter((shift) => {
      const date = shiftDateKey(shift)
      return date >= weekStart && date <= weekEnd
    })
    .sort((a, b) =>
      `${shiftDateKey(a)} ${a.startTime}`.localeCompare(
        `${shiftDateKey(b)} ${b.startTime}`,
      ),
    )

  const activeSchedule = weeklySchedules.find(
    (shift) => shift._id === activeId,
  )

  const assignedEmployees = activeSchedule?.employees ?? []

  useEffect(() => {
    const controller = new AbortController()

    getSchedules({ signal: controller.signal })
      .then(setSchedules)
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    setAvailable([])
    setEmployeeId('')
    setAvailableError('')

    if (!activeId) {
      setAvailableLoading(false)
      return
    }

    const controller = new AbortController()
    setAvailableLoading(true)

    getAvailableEmployees(activeId, { signal: controller.signal })
      .then(setAvailable)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setAvailableError(error.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailableLoading(false)
      })

    return () => controller.abort()
  }, [activeId, availableVersion])

  async function refreshSchedules() {
    if (operationRef.current) return

    operationRef.current = true
    setLoading(true)
    setLoadError('')

    try {
      const result = await getSchedules()
      setSchedules(result)
      setSaveUncertain(false)
      setAvailableVersion((current) => current + 1)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setLoading(false)
      operationRef.current = false
    }
  }

  function moveToWeek(offset) {
    if (busy || loading) return false
    if (offset === weekOffset) return true

    if (
      selectedDates.length > 0 &&
      !window.confirm('Leave this week and discard unsaved shift selections?')
    ) {
      return false
    }

    setWeekOffset(offset)
    setSelectedDates([])
    setShiftHours({})
    setActiveId('')
    setFeedback(null)
    setAssignmentFeedback(null)
    return true
  }

  function closeCalendar() {
    setCalendarOpen(false)
    requestAnimationFrame(() => calendarButtonRef.current?.focus())
  }

  function selectCalendarDate(date) {
    const monday = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    )

    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const currentMonday = getWeekDates(0)[0]

    const stamp = (value) =>
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())

    const offset = Math.round(
      (stamp(monday) - stamp(currentMonday)) / 604800000,
    )

    if (moveToWeek(offset)) closeCalendar()
  }

  function toggleDate(date) {
    const key = getDateKey(date)
    setFeedback(null)
    setSelectedDates((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key].sort(),
    )
  }

  function updateHours(key, field, value) {
    setFeedback(null)
    setShiftHours((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }))
  }

  async function saveSelectedShifts() {
    if (operationRef.current || saveUncertain) return

    const drafts = selectedDates.map((shiftDate) => ({
      shiftDate,
      startTime: shiftHours[shiftDate]?.startTime ?? '',
      endTime: shiftHours[shiftDate]?.endTime ?? '',
    }))

    if (!drafts.length) return

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

    for (const draft of drafts) {
      if (
        !timePattern.test(draft.startTime) ||
        !timePattern.test(draft.endTime) ||
        draft.endTime <= draft.startTime
      ) {
        setFeedback({
          variant: 'error',
          message: `${draft.shiftDate}: enter valid hours with the end after the start.`,
        })
        return
      }

      const duplicate = schedules.some(
        (shift) =>
          shiftDateKey(shift) === draft.shiftDate &&
          shift.startTime === draft.startTime &&
          shift.endTime === draft.endTime,
      )

      if (duplicate) {
        setFeedback({
          variant: 'error',
          message: `${draft.shiftDate}: this time range already exists. Select the saved shift below.`,
        })
        return
      }
    }

    operationRef.current = true
    setBusy(true)
    setFeedback(null)
    let savedCount = 0

    try {
      for (const draft of drafts) {
        const saved = await createSchedule(draft)
        savedCount += 1

        setSchedules((current) => [...current, saved])
        setSelectedDates((current) =>
          current.filter((date) => date !== draft.shiftDate),
        )
        setActiveId(saved._id)
      }

      setFeedback({
        variant: 'success',
        message: `${savedCount} shift(s) saved. Select a saved shift to assign employees.`,
      })
    } catch (error) {
      setSaveUncertain(true)
      setFeedback({
        variant: 'error',
        message:
          `${savedCount} shift(s) confirmed saved. ${error.message} ` +
          'Refresh saved shifts before trying again to check what was stored.',
      })
    } finally {
      setBusy(false)
      operationRef.current = false
    }
  }

  async function changeAssignment(action, id) {
    if (operationRef.current || !activeSchedule) return

    operationRef.current = true
    setBusy(true)
    setAssignmentFeedback(null)

    try {
      const updated =
        action === 'add'
          ? await assignEmployee(activeId, id)
          : await removeEmployee(activeId, id)

      setSchedules((current) =>
        current.map((shift) =>
          shift._id === updated._id ? updated : shift,
        ),
      )

      setEmployeeId('')
      setAssignmentFeedback({
        variant: 'success',
        message:
          action === 'add'
            ? 'Employee assigned successfully.'
            : 'Employee removed successfully.',
      })
    } catch (error) {
      setAssignmentFeedback({
        variant: 'error',
        message: `${error.message} Refresh saved shifts if the result is uncertain.`,
      })
    } finally {
      setAvailableVersion((current) => current + 1)
      setBusy(false)
      operationRef.current = false
    }
  }

  return (
    <section className="schedule-page" aria-labelledby="schedule-page-title">
      <header className="schedule-page__header">
        <p className="schedule-page__eyebrow">Scheduling</p>
        <h1 id="schedule-page-title">Create weekly schedule</h1>
        <p>Save shift dates and hours, then assign available employees.</p>
      </header>

      <div className="schedule-page__layout">
        <section className="schedule-calendar" aria-label="Schedule calendar">
          {calendarOpen ? (
            <CalendarDatePicker
              initialDate={weekDates[0]}
              onSelect={selectCalendarDate}
              onCancel={closeCalendar}
            />
          ) : (
            <>
              <div className="schedule-calendar__navigation">
                <button
                  type="button"
                  disabled={busy || loading}
                  onClick={() => moveToWeek(weekOffset - 1)}
                >
                  Previous week
                </button>

                <h2>
                  {dateFormatter.format(weekDates[0])}
                  {' – '}
                  {dateFormatter.format(weekDates[6])}
                </h2>

                <button
                  type="button"
                  disabled={busy || loading}
                  onClick={() => moveToWeek(weekOffset + 1)}
                >
                  Next week
                </button>
              </div>

              <div className="schedule-calendar__days">
                {weekDates.map((date) => {
                  const key = getDateKey(date)
                  const selected = selectedDates.includes(key)

                  return (
                    <button
                      key={key}
                      className={`schedule-calendar__day${selected ? ' is-selected' : ''}`}
                      type="button"
                      disabled={busy}
                      aria-pressed={selected}
                      aria-label={dateFormatter.format(date)}
                      onClick={() => toggleDate(date)}
                    >
                      <span>{weekdayFormatter.format(date)}</span>
                      <strong>{date.getDate()}</strong>
                    </button>
                  )
                })}
              </div>

              <p className="schedule-calendar__selection" role="status">
                {selectedDates.length
                  ? `${selectedDates.length} date(s) selected for new shifts.`
                  : 'Select dates to create new shifts.'}
              </p>

              {selectedDates.map((key) => (
                <article className="schedule-date-card" key={key}>
                  <h3>
                    {dateFormatter.format(new Date(`${key}T00:00:00`))}
                  </h3>
                  <div className="schedule-date-card__times">
                    {['startTime', 'endTime'].map((field) => (
                      <div className="form-field" key={field}>
                        <label htmlFor={`${key}-${field}`}>
                          {field === 'startTime' ? 'Start time' : 'End time'}
                        </label>
                        <input
                          id={`${key}-${field}`}
                          type="time"
                          disabled={busy}
                          value={shiftHours[key]?.[field] ?? ''}
                          onChange={(event) =>
                            updateHours(key, field, event.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </article>
              ))}

              {feedback && (
                <FeedbackMessage variant={feedback.variant}>
                  {feedback.message}
                </FeedbackMessage>
              )}

              <div className="schedule-calendar__footer">
                <button
                  ref={calendarButtonRef}
                  className="schedule-calendar__open-picker"
                  type="button"
                  disabled={busy || loading}
                  aria-label="Open calendar to choose a week"
                  title="Choose a week"
                  onClick={() => setCalendarOpen(true)}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                    <path d="M8 15h2M14 15h2M8 18h2" />
                  </svg>
                </button>

                <button
                  className="button button--primary"
                  type="button"
                  disabled={
                    busy ||
                    loading ||
                    Boolean(loadError) ||
                    saveUncertain ||
                    selectedDates.length === 0
                  }
                  onClick={saveSelectedShifts}
                >
                  {busy ? 'Working…' : 'Save selected shifts'}
                </button>
              </div>
            </>
          )}
        </section>

        <aside className="schedule-preview" aria-labelledby="assignment-title">
          <h2 id="assignment-title">Employee assignment</h2>
          <p>Select a saved shift to manage its employees.</p>

          <button
            className="schedule-action"
            type="button"
            disabled={loading || busy}
            onClick={refreshSchedules}
          >
            {loading ? 'Loading shifts…' : 'Refresh saved shifts'}
          </button>

          {loadError && (
            <FeedbackMessage variant="error">
              {loadError}
            </FeedbackMessage>
          )}

          {!loading && !loadError && weeklySchedules.length === 0 && (
            <p>No saved shifts for this week. Save a shift to get started.</p>
          )}

          {weeklySchedules.length > 0 && (
            <div className="assignment-field">
              <label htmlFor="saved-shift">Saved shift</label>
              <select
                id="saved-shift"
                value={activeSchedule ? activeId : ''}
                disabled={busy || loading || Boolean(loadError)}
                onChange={(event) => {
                  setActiveId(event.target.value)
                  setAssignmentFeedback(null)
                }}
              >
                <option value="">Select a shift</option>
                {weeklySchedules.map((shift) => (
                  <option key={shift._id} value={shift._id}>
                    {shiftLabel(shift)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSchedule && !loading && !loadError && (
            <>
              <section className="assignment-section">
                <h3>Assigned employees</h3>

                {assignedEmployees.length === 0 ? (
                  <p>No employees assigned yet.</p>
                ) : (
                  <ul className="assignment-list">
                    {assignedEmployees.map((employee) => {
                      const id =
                        typeof employee === 'string'
                          ? employee
                          : employee._id

                      return (
                        <li key={id}>
                          <div>
                            <strong>
                              {typeof employee === 'string'
                                ? 'Employee details not loaded'
                                : employee.name}
                            </strong>
                            {employee.position && (
                              <span>{employee.position}</span>
                            )}
                          </div>
                          <button
                            className="schedule-action"
                            type="button"
                            disabled={busy}
                            aria-label={`Remove ${employee.name || 'employee'} from shift`}
                            onClick={() => changeAssignment('remove', id)}
                          >
                            Remove
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="assignment-section">
                <h3>Available employees</h3>

                {availableLoading ? (
                  <p role="status">Loading available employees…</p>
                ) : availableError ? (
                  <>
                    <FeedbackMessage variant="error">
                      {availableError}
                    </FeedbackMessage>
                    <button
                      className="schedule-action"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setAvailableVersion((current) => current + 1)
                      }
                    >
                      Retry
                    </button>
                  </>
                ) : available.length === 0 ? (
                  <p>No additional employees are available for this shift.</p>
                ) : (
                  <form
                    className="assignment-field"
                    onSubmit={(event) => {
                      event.preventDefault()
                      if (employeeId) changeAssignment('add', employeeId)
                    }}
                  >
                    <label htmlFor="available-employee">Employee</label>
                    <select
                      id="available-employee"
                      value={employeeId}
                      required
                      disabled={busy}
                      onChange={(event) => setEmployeeId(event.target.value)}
                    >
                      <option value="">Select an employee</option>
                      {available.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.name}
                          {employee.position ? ` · ${employee.position}` : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      className="schedule-action schedule-action--primary"
                      type="submit"
                      disabled={busy || !employeeId}
                    >
                      {busy ? 'Working…' : 'Assign employee'}
                    </button>
                  </form>
                )}
              </section>
            </>
          )}

          {assignmentFeedback && (
            <FeedbackMessage variant={assignmentFeedback.variant}>
              {assignmentFeedback.message}
            </FeedbackMessage>
          )}
        </aside>
      </div>
    </section>
  )
}

export default NewSchedulePage