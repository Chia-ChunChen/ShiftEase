import { useEffect, useRef, useState } from 'react'
import './NewSchedulePage.css'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import CalendarDatePicker from '../../../shared/components/CalendarDatePicker.jsx'
import { getSchedules, createWeeklySchedule, getAvailableEmployees, assignEmployee,
  updateAssignment, removeAssignment, updateSchedule, publishSchedule } from '../services/scheduleService.js'
import { copyDayHours, validHours, minutes } from '../scheduleRules.js'

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const keyFor = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const labelFor = key => dateFormatter.format(new Date(`${key}T12:00:00`))
const dayKey = schedule => String(schedule.shiftDate).slice(0, 10)
const personName = person => typeof person === 'object' && person ? person.name : 'Employee'
function weekFor(offset) {
  const monday = new Date()
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(date.getDate() + index); return date
  })
}

function TimeFields({ id, value, onChange, disabled }) {
  return <div className="schedule-date-card__times">
    <label className="form-field" htmlFor={`${id}-start`}>Start time
      <input id={`${id}-start`} type="time" required value={value.startTime || ''} disabled={disabled}
        onChange={event => onChange({ ...value, startTime: event.target.value })} />
    </label>
    <label className="form-field" htmlFor={`${id}-end`}>End time
      <input id={`${id}-end`} type="time" required value={value.endTime || ''} disabled={disabled}
        onChange={event => onChange({ ...value, endTime: event.target.value })} />
    </label>
  </div>
}

function AssignedShift({ assignment, busy, onSave, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ startTime: assignment.startTime, endTime: assignment.endTime })
  return <li className="personal-shift">
    <div className="personal-shift__heading"><div><strong>{personName(assignment.employee)}</strong>
      <span>{assignment.employee?.position || 'Employee'} · {assignment.startTime}–{assignment.endTime}</span></div>
      <div className="schedule-inline-actions">
        {!editing && <button className="schedule-action" disabled={busy} onClick={() => {
          setDraft({ startTime: assignment.startTime, endTime: assignment.endTime }); setEditing(true)
        }}>Edit shift</button>}
        <button className="schedule-action" disabled={busy} onClick={onRemove}>Remove</button>
      </div>
    </div>
    {editing && <form className="personal-shift__form" onSubmit={async event => {
      event.preventDefault()
      if (await onSave(draft)) setEditing(false)
    }}>
      <TimeFields id={`edit-${assignment._id}`} value={draft} onChange={setDraft} disabled={busy} />
      <div className="schedule-inline-actions"><button type="submit" className="schedule-action schedule-action--primary" disabled={busy}>Save shift</button>
        <button type="button" className="schedule-action" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div>
    </form>}
  </li>
}

function Candidate({ employee, busy, onAdd }) {
  const windows = employee.availableWindows || []
  const [selectedWindow, setSelectedWindow] = useState('0')
  const [times, setTimes] = useState(windows[0] || { startTime: '', endTime: '' })
  return <form className="candidate-card" onSubmit={event => { event.preventDefault(); onAdd(times) }}>
    <div><strong>{employee.name}</strong><p>{employee.position}</p></div>
    <p className="candidate-card__availability">Available: {windows.map(window => `${window.startTime}–${window.endTime}`).join(', ')}</p>
    {windows.length > 1 && <label className="assignment-field">Use available window
      <select value={selectedWindow} disabled={busy} onChange={event => {
        setSelectedWindow(event.target.value); setTimes(windows[Number(event.target.value)])
      }}>{windows.map((window, index) => <option key={index} value={index}>{window.startTime}–{window.endTime}</option>)}</select>
    </label>}
    <TimeFields id={`candidate-${employee._id}`} value={times} onChange={setTimes} disabled={busy} />
    <button type="submit" className="schedule-action schedule-action--primary" disabled={busy}>Add employee shift</button>
  </form>
}

function Coverage({ day }) {
  const duration = minutes(day.endTime) - minutes(day.startTime)
  const gaps = (day.coverage || []).filter(segment => segment.employeeCount === 0)
  return <section className="assignment-section" aria-labelledby="coverage-title">
    <h3 id="coverage-title">Day coverage</h3>
    <div className="coverage-axis"><span>{day.startTime}</span><span>{day.endTime}</span></div>
    <div className="coverage-strip" aria-label="Number of employees covering each time period">
      {(day.coverage || []).map(segment => <div key={segment.startTime} className={segment.employeeCount ? 'coverage-covered' : 'coverage-gap'}
        style={{ flexGrow: minutes(segment.endTime) - minutes(segment.startTime) }}
        title={`${segment.startTime}–${segment.endTime}: ${segment.employeeCount} employee(s)`}>
        {segment.employeeCount}</div>)}
    </div>
    <p className={gaps.length ? 'schedule-warning' : 'schedule-covered'} role="status">{gaps.length
      ? `Uncovered: ${gaps.map(gap => `${gap.startTime}–${gap.endTime}`).join(', ')}. Review staffing before publishing.`
      : 'The entire work period has at least one employee assigned.'}</p>
    <div className="schedule-timeline" aria-label="Employee shifts during this work period">
      {(day.assignments || []).map(assignment => <div className="timeline-row" key={assignment._id}>
        <span>{personName(assignment.employee)}</span><div className="timeline-track">
          <div className="timeline-shift" style={{ left: `${100 * (minutes(assignment.startTime) - minutes(day.startTime)) / duration}%`,
            width: `${100 * (minutes(assignment.endTime) - minutes(assignment.startTime)) / duration}%` }}
            title={`${personName(assignment.employee)}: ${assignment.startTime}–${assignment.endTime}`}>
            {assignment.startTime}–{assignment.endTime}</div>
        </div>
      </div>)}
    </div>
  </section>
}

function NewSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDates, setSelectedDates] = useState([])
  const [hours, setHours] = useState({})
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [copySource, setCopySource] = useState('')
  const [copyTargets, setCopyTargets] = useState([])
  const [overwrite, setOverwrite] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [assignmentFeedback, setAssignmentFeedback] = useState(null)
  const [saveUncertain, setSaveUncertain] = useState(false)
  const [availableVersion, setAvailableVersion] = useState(0)
  const [candidateResult, setCandidateResult] = useState({ id: '', version: -1, employees: [], error: '' })
  const [editingDay, setEditingDay] = useState(false)
  const [dayDraft, setDayDraft] = useState({ startTime: '', endTime: '' })
  const operationRef = useRef(false)
  const calendarButtonRef = useRef(null)
  const dates = weekFor(weekOffset)
  const keys = dates.map(keyFor)
  const weekly = schedules.filter(day => dayKey(day) >= keys[0] && dayKey(day) <= keys[6])
    .sort((a, b) => `${dayKey(a)} ${a.startTime}`.localeCompare(`${dayKey(b)} ${b.startTime}`))
  const active = weekly.find(day => day._id === activeId) || weekly[0]
  const selectedId = active?._id || ''
  const resultCurrent = candidateResult.id === selectedId && candidateResult.version === availableVersion

  useEffect(() => {
    const abort = new AbortController()
    getSchedules({ signal: abort.signal }).then(result => {
      if (!abort.signal.aborted) setSchedules(result)
    }).catch(error => { if (error.name !== 'AbortError') setLoadError(error.message) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const abort = new AbortController()
    getAvailableEmployees(selectedId, { signal: abort.signal }).then(employees => {
      if (!abort.signal.aborted) setCandidateResult({ id: selectedId, version: availableVersion, employees, error: '' })
    }).catch(error => {
      if (!abort.signal.aborted) setCandidateResult({ id: selectedId, version: availableVersion, employees: [], error: error.message })
    })
    return () => abort.abort()
  }, [selectedId, availableVersion])

  function moveWeek(offset) {
    if (busy || operationRef.current) return false
    if (offset === weekOffset) return true
    if ((selectedDates.length || editingDay) && !window.confirm('Discard unsaved draft changes and change week?')) return false
    setWeekOffset(offset); setSelectedDates([]); setHours({}); setActiveId(''); setCopySource('')
    setEditingDay(false); setFeedback(null); setAssignmentFeedback(null)
    return true
  }
  function selectCalendarDate(date) {
    const monday = new Date(date); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const current = weekFor(0)[0]
    const stamp = value => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    if (moveWeek(Math.round((stamp(monday) - stamp(current)) / 604800000))) setCalendarOpen(false)
  }
  function changeHours(date, value) { setHours(current => ({ ...current, [date]: value })); setFeedback(null) }
  function applyCopy() {
    try {
      setHours(copyDayHours(hours, copySource, copyTargets, overwrite))
      setSelectedDates(current => [...new Set([...current, ...copyTargets])].sort())
      setFeedback({ variant: 'success', message: `Work hours copied to ${copyTargets.length} date(s). Save selected days to store them.` })
      setCopySource('')
    } catch (error) { setFeedback({ variant: 'error', message: error.message }) }
  }
  async function refreshSchedules() {
    if (operationRef.current) return
    operationRef.current = true; setLoading(true); setLoadError('')
    try { setSchedules(await getSchedules()); setSaveUncertain(false); setAvailableVersion(value => value + 1) }
    catch (error) { setLoadError(error.message) }
    finally { operationRef.current = false; setLoading(false) }
  }
  async function saveDays() {
    if (operationRef.current || saveUncertain) return
    const entries = selectedDates.map(shiftDate => ({ shiftDate, ...hours[shiftDate] }))
    for (const entry of entries) {
      if (!validHours(entry)) { setFeedback({ variant: 'error', message: `${entry.shiftDate}: enter valid work hours.` }); return }
      if (schedules.some(day => dayKey(day) === entry.shiftDate && day.startTime === entry.startTime && day.endTime === entry.endTime)) {
        setFeedback({ variant: 'error', message: `${entry.shiftDate}: this work period is already saved. Select it on the right.` }); return
      }
    }
    if (!entries.length) return
    operationRef.current = true; setBusy(true); setFeedback(null)
    try {
      const saved = await createWeeklySchedule(entries)
      setSchedules(current => [...current, ...saved]); setActiveId(saved[0]._id)
      setSelectedDates([]); setHours({}); setCopySource(''); setEditingDay(false)
      setAvailableVersion(value => value + 1)
      setFeedback({ variant: 'success', message: `${saved.length} work day(s) saved. Add each employee's personal shift on the right.` })
    } catch (error) {
      setSaveUncertain(true)
      setFeedback({ variant: 'error', message: `${error.message} Refresh saved days before retrying to check whether the batch was stored.` })
    } finally { operationRef.current = false; setBusy(false) }
  }
  async function mutate(operation, message) {
    if (operationRef.current || !active) return false
    operationRef.current = true; setBusy(true); setAssignmentFeedback(null)
    try {
      const updated = await operation()
      setSchedules(current => current.map(day => day._id === updated._id ? updated : day))
      setAssignmentFeedback({ variant: 'success', message }); return true
    } catch (error) { setAssignmentFeedback({ variant: 'error', message: error.message }); return false }
    finally { operationRef.current = false; setBusy(false); setAvailableVersion(value => value + 1) }
  }
  async function publishDay() {
    const gaps = (active.coverage || []).filter(segment => segment.employeeCount === 0)
    if (gaps.length && !window.confirm(`Uncovered hours: ${gaps.map(gap => `${gap.startTime}–${gap.endTime}`).join(', ')}. Publish this day anyway?`)) return
    await mutate(() => publishSchedule(active._id), 'Work day published. Changes to hours or employee shifts will return it to draft.')
  }

  return <section className="schedule-page" aria-labelledby="schedule-page-title">
    <header className="schedule-page__header"><p className="schedule-page__eyebrow">Scheduling</p>
      <h1 id="schedule-page-title">Create weekly schedule</h1>
      <p>Set each day's work hours, copy them to other dates, then give each employee their own shift.</p>
    </header>
    <div className="schedule-page__layout">
      <section className="schedule-calendar" aria-labelledby="work-days-title">
        <div><h2 id="work-days-title">1. Set work days</h2><p className="schedule-help">These hours describe the work period to cover. Employees can cover different parts of it.</p></div>
        <div className="schedule-calendar__navigation"><button disabled={busy || loading} onClick={() => moveWeek(weekOffset - 1)}>Previous week</button>
          <h3>{labelFor(keys[0])} – {labelFor(keys[6])}</h3><button disabled={busy || loading} onClick={() => moveWeek(weekOffset + 1)}>Next week</button></div>
        <div className="schedule-calendar__days">{dates.map((date, index) => <button key={keys[index]} className={`schedule-calendar__day ${selectedDates.includes(keys[index]) ? 'is-selected' : ''}`}
          aria-pressed={selectedDates.includes(keys[index])} aria-label={`Select ${labelFor(keys[index])}`} disabled={busy || loading} onClick={() => {
            const dateKey = keys[index]; setSelectedDates(current => current.includes(dateKey) ? current.filter(value => value !== dateKey) : [...current, dateKey].sort()); setCopySource(''); setFeedback(null)
          }}><span>{weekdayFormatter.format(date)}</span><strong>{date.getDate()}</strong></button>)}</div>
        <p className="schedule-calendar__selection">{selectedDates.length} date(s) selected. Choose a date above to enter its work hours.</p>
        {selectedDates.map(date => <section className="schedule-date-card" key={date}>
          <div className="schedule-date-card__heading"><h3>{labelFor(date)}</h3><button className="schedule-action" disabled={busy} onClick={() => {
            setCopySource(copySource === date ? '' : date); setCopyTargets(selectedDates.filter(value => value !== date)); setOverwrite(false)
          }}>Copy to…</button></div>
          <TimeFields id={`day-${date}`} value={hours[date] || {}} onChange={value => changeHours(date, value)} disabled={busy} />
          {copySource === date && <fieldset className="copy-days" disabled={busy}><legend>Copy work hours to</legend>
            <div className="schedule-inline-actions"><button type="button" className="schedule-action" onClick={() => setCopyTargets(selectedDates.filter(value => value !== date))}>Other selected dates</button>
              <button type="button" className="schedule-action" onClick={() => setCopyTargets(keys.slice(0, 5).filter(value => value !== date))}>Mon–Fri</button>
              <button type="button" className="schedule-action" onClick={() => setCopyTargets(keys.filter(value => value !== date))}>Whole week</button></div>
            <div className="copy-days__options">{keys.filter(value => value !== date).map(value => <label key={value}>
              <input type="checkbox" checked={copyTargets.includes(value)} onChange={event => setCopyTargets(current => event.target.checked ? [...current, value] : current.filter(item => item !== value))} />
              {weekdayFormatter.format(new Date(`${value}T12:00:00`))} {value.slice(5)}{hours[value]?.startTime || hours[value]?.endTime ? ' · has draft hours' : ''}</label>)}</div>
            <label className="copy-days__replace"><input type="checkbox" checked={overwrite} onChange={event => setOverwrite(event.target.checked)} />Replace existing draft hours</label>
            <p className="schedule-help">Copies only work hours into the draft. Saved days and employee shifts are not changed.</p>
            <div className="schedule-inline-actions"><button className="schedule-action schedule-action--primary" onClick={applyCopy}>Copy hours</button><button className="schedule-action" onClick={() => setCopySource('')}>Cancel</button></div>
          </fieldset>}
        </section>)}
        <div className="schedule-calendar__footer"><button ref={calendarButtonRef} className="schedule-action" disabled={busy} onClick={() => setCalendarOpen(true)}>Choose week…</button>
          <button className="schedule-action schedule-action--primary" disabled={busy || loading || !selectedDates.length || saveUncertain} onClick={saveDays}>{busy ? 'Saving…' : 'Save selected days'}</button></div>
        {calendarOpen && <CalendarDatePicker initialDate={dates[0]} onSelect={selectCalendarDate} onCancel={() => {
          setCalendarOpen(false); requestAnimationFrame(() => calendarButtonRef.current?.focus())
        }} />}
        {feedback && <FeedbackMessage variant={feedback.variant}>{feedback.message}</FeedbackMessage>}
      </section>
      <aside className="schedule-preview" aria-labelledby="assignment-title">
        <div className="schedule-date-card__heading"><h2 id="assignment-title">2. Arrange employee shifts</h2>
          <button className="schedule-action" disabled={busy || loading} onClick={refreshSchedules}>{loading ? 'Loading…' : 'Refresh saved days'}</button></div>
        {loadError && <FeedbackMessage variant="error">{loadError}</FeedbackMessage>}
        {!loading && !loadError && !weekly.length && <p>No saved work days in this week. Save your selected days first.</p>}
        {active && !loadError && <>
          <label className="assignment-field">Saved work day<select value={selectedId} disabled={busy || loading} onChange={event => {
            if (editingDay && !window.confirm('Discard unsaved work hour edits?')) return
            setActiveId(event.target.value); setEditingDay(false); setAssignmentFeedback(null)
          }}>{weekly.map(day => <option key={day._id} value={day._id}>{labelFor(dayKey(day))} · {day.startTime}–{day.endTime} · {day.status}</option>)}</select></label>
          <div className="work-day-summary"><span className={`day-status ${active.status === 'published' ? 'day-status--published' : ''}`}>{active.status === 'published' ? 'Published' : 'Draft'}</span>
            {!editingDay && <button className="schedule-action" disabled={busy} onClick={() => { setDayDraft({ startTime: active.startTime, endTime: active.endTime }); setEditingDay(true) }}>Edit work hours</button>}
            <button className="schedule-action schedule-action--primary" disabled={busy || !active.assignments?.length || active.status === 'published'} onClick={publishDay}>Publish day</button></div>
          {editingDay && <form className="schedule-date-card" onSubmit={async event => {
            event.preventDefault()
            if (await mutate(() => updateSchedule(active._id, { shiftDate: dayKey(active), ...dayDraft }), 'Work hours updated. Employee shifts were checked.')) setEditingDay(false)
          }}><TimeFields id="edit-day" value={dayDraft} onChange={setDayDraft} disabled={busy} />
            <p className="schedule-help">Employee shifts must remain inside these hours. Changing a published day returns it to draft.</p>
            <div className="schedule-inline-actions"><button className="schedule-action schedule-action--primary" type="submit" disabled={busy}>Save work hours</button><button className="schedule-action" type="button" disabled={busy} onClick={() => setEditingDay(false)}>Cancel</button></div>
          </form>}
          {assignmentFeedback && <FeedbackMessage variant={assignmentFeedback.variant}>{assignmentFeedback.message}</FeedbackMessage>}
          <Coverage day={active} />
          <section className="assignment-section"><h3>Assigned employee shifts</h3>
            {!active.assignments?.length ? <p>No employee shifts yet. Add employees below to cover this work period.</p> : <ul className="assignment-list">
              {active.assignments.map(assignment => <AssignedShift key={assignment._id} assignment={assignment} busy={busy}
                onSave={times => mutate(() => updateAssignment(active._id, assignment._id, times), 'Employee shift updated.')}
                onRemove={() => mutate(() => removeAssignment(active._id, assignment._id), 'Employee shift removed.')} />)}
            </ul>}
          </section>
          <section className="assignment-section"><h3>Available employees</h3><p>Choose personal shift hours within the available windows below. Existing assignments are already excluded.</p>
            {!resultCurrent ? <p role="status">Checking availability…</p> : candidateResult.error ? <>
              <FeedbackMessage variant="error">{candidateResult.error}</FeedbackMessage><button className="schedule-action" disabled={busy} onClick={() => setAvailableVersion(value => value + 1)}>Retry availability</button>
            </> : !candidateResult.employees.length ? <p>No remaining available time for this work period.</p> : candidateResult.employees.map(employee =>
              <Candidate key={`${employee._id}-${availableVersion}`} employee={employee} busy={busy}
                onAdd={times => mutate(() => assignEmployee(active._id, employee._id, times), 'Employee shift added.')} />)}
          </section>
        </>}
      </aside>
    </div>
  </section>
}

export default NewSchedulePage
