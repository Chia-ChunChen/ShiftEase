import { useEffect, useRef, useState } from 'react'
import AvailabilityCalendar from '../components/AvailabilityCalendar.jsx'
import AvailabilityWeek from '../components/AvailabilityWeek.jsx'
import { DAYS, blankWeek, blankWindow, buildDays, displayDate, earliestStart, validStart } from '../availabilityRules.js'
import { getCurrentAvailability, getMyAvailabilityRequests, submitAvailabilityRequest } from '../services/availabilityRequestService.js'
import './AvailabilityPage.css'
import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'

function TimeSelect({ label, value, onChange, disabled, id }) {
  return <fieldset className="av-time-select" disabled={disabled}>
    <legend>{label}</legend>
    <select aria-label={`${id} hour`} value={value.hour} onChange={(event) => onChange({ ...value, hour: event.target.value })}>
      <option value="">Hour</option>
      {Array.from({ length: 12 }, (_, index) => <option key={index} value={String(index + 1)}>{index + 1}</option>)}
    </select>
    <span>:</span>
    <select aria-label={`${id} minute`} value={value.minute} onChange={(event) => onChange({ ...value, minute: event.target.value })}>
      <option value="">Min</option>
      {Array.from({ length: 60 }, (_, index) => <option key={index} value={String(index).padStart(2, '0')}>{String(index).padStart(2, '0')}</option>)}
    </select>
    <select aria-label={`${id} AM or PM`} value={value.period} onChange={(event) => onChange({ ...value, period: event.target.value })}>
      <option>AM</option><option>PM</option>
    </select>
  </fieldset>
}

function TrashIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
}

export default function AvailabilityPage() {
  const [current, setCurrent] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [mode, setMode] = useState('current')
  const [periodStart, setPeriodStart] = useState('')
  const [week, setWeek] = useState(blankWeek)
  const [activeDay, setActiveDay] = useState(0)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [targets, setTargets] = useState([])
  const [copyMessage, setCopyMessage] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [requestKey, setRequestKey] = useState('')
  const submittingRef = useRef(false)
  const headingRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setLoadError('')
      try {
        const [effective, history] = await Promise.all([
          getCurrentAvailability({ signal: controller.signal }),
          getMyAvailabilityRequests({ signal: controller.signal }),
        ])
        if (!controller.signal.aborted) { setCurrent(effective); setRequests(history) }
      } catch (failure) {
        if (failure.name !== 'AbortError') setLoadError(failure.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [reload])

  function openMode(next) {
    setMode(next)
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function startRequest() {
    setPeriodStart(''); setWeek(blankWeek()); setActiveDay(0)
    setError(''); setSummary(null); setSubmitted(false); setUncertain(false)
    setCalendarOpen(false); setCopyOpen(false); setTargets([]); setCopyMessage('')
    setRequestKey(crypto.randomUUID())
    openMode('edit')
  }

  function updateWindows(day, windows) {
    setWeek((previous) => previous.map((entry, index) => index === day ? windows : entry))
    setError(''); setCopyMessage('')
  }

  function chooseDay(day) {
    setActiveDay(day); setCopyOpen(false); setTargets([]); setCopyMessage('')
  }

  function copyToDays() {
    try {
      buildDays(week.map((windows, index) => index === activeDay ? windows : []))
      if (!week[activeDay].length) throw new Error('Add an availability window before copying.')
      if (!targets.length) throw new Error('Select at least one destination day.')
      const occupied = targets.filter((day) => week[day].length > 0)
      if (occupied.length) throw new Error(`${occupied.map((day) => DAYS[day]).join(', ')} already has availability. Delete its windows first.`)
      setWeek((previous) => previous.map((windows, index) => targets.includes(index) ? structuredClone(previous[activeDay]) : windows))
      setCopyMessage(`Copied to ${targets.map((day) => DAYS[day]).join(', ')}.`)
      setTargets([]); setCopyOpen(false)
    } catch (failure) { setCopyMessage(failure.message) }
  }

  function reviewRequest() {
    try {
      if (!validStart(periodStart)) throw new Error('Please select a start date at least 8 days from now.')
      const days = buildDays(week)
      setSummary({ periodStart, days, clientRequestId: requestKey })
      setError(''); setCalendarOpen(false); openMode('review')
    } catch (failure) { setError(failure.message) }
  }

  async function confirmRequest() {
    if (submittingRef.current) return
    // An uncertain retry uses exactly the same payload/key, even if the deadline passed.
    if (!uncertain && !validStart(summary.periodStart)) {
      setError('This start date is now too soon. Go back and select a date at least 8 days from now.')
      return
    }
    submittingRef.current = true; setSubmitting(true); setError('')
    try {
      await submitAvailabilityRequest(summary)
      setSubmitted(true); setUncertain(false); openMode('current')
      setReload((value) => value + 1)
    } catch (failure) {
      setUncertain(true)
      setError(`${failure.message} You can retry this same request or check My requests. Do not create a duplicate request.`)
    } finally { submittingRef.current = false; setSubmitting(false) }
  }

  const latestRequest = [...requests].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() -
      new Date(a.submittedAt).getTime(),
  )[0]

  return <section className="av-page">
    <header className="av-page-header">
      <div><p className="av-eyebrow">Employee workspace</p><h1 ref={headingRef} tabIndex={-1}>{mode === 'current' ? 'Availability' : mode === 'edit' ? 'New availability' : 'Days and times selected'}</h1></div>
      {mode === 'current' && <button className="av-button av-primary" type="button" onClick={startRequest}>New availability</button>}
    </header>

    {mode === 'current' && <>
      {submitted && <p className="av-success" role="status">✓ Request submitted. Pending manager approval.</p>}
      <section className="av-card">
        <h2 className="av-centered">Current availability</h2>
        <div className="av-refresh"><button className="av-text-button" disabled={loading} onClick={() => setReload((value) => value + 1)}>Refresh availability</button></div>
        {loading ? <p role="status">Loading availability…</p> : loadError ? <p className="av-error" role="alert">{loadError}</p> : current ? <>
          <p className="av-centered">Effective from {displayDate(current.effectiveFrom || current.periodStart)}</p>
          <AvailabilityWeek days={current.days} />
        </> : <p className="av-centered">No approved availability is currently in effect.</p>}
      </section>
      {!loading && !loadError && latestRequest?.status === 'pending' && (
        <section className="av-pending-card" aria-labelledby="latest-request-title">
          <div>
            <h2 id="latest-request-title">Latest availability request</h2>
            <p>
              Period starting {displayDate(latestRequest.periodStart)}
            </p>
          </div>

          <span className="av-status av-status--pending">Pending</span>

          <Link
            className="av-text-button"
            to={ROUTES.EMPLOYEE_REQUESTS}
          >
            Check my requests
          </Link>
        </section>
      )}
    </>}

    {mode === 'edit' && <section className="av-card">
      <div className="av-period">
        <label id="period-label">Period starting</label>
        <button type="button" className="av-date-button" aria-labelledby="period-label period-value" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((value) => !value)}>
          <span id="period-value">{periodStart ? displayDate(periodStart) : 'Select a start date'}</span><span aria-hidden="true">▦</span>
        </button>
        {calendarOpen && <AvailabilityCalendar initialDate={periodStart || earliestStart()} onSelect={(key) => { setPeriodStart(key); setCalendarOpen(false); setError('') }} onClose={() => setCalendarOpen(false)} />}
      </div>
      <p>Please select a start date at least 8 days from now.</p>
      <div className="av-days-row" aria-label="Choose a day to edit">
        {DAYS.map((day, index) => <button type="button" key={day} className={`${week[index].length ? 'av-selected-day' : ''} ${activeDay === index ? 'av-active-day' : ''}`} aria-pressed={activeDay === index} onClick={() => chooseDay(index)}>{day}</button>)}
      </div>
      <div className="av-copy">
        <button className="av-text-button" type="button" aria-expanded={copyOpen} onClick={() => { setCopyOpen((value) => !value); setCopyMessage(''); setTargets([]) }}>Copy to</button>
        {copyOpen && <div className="av-copy-panel">
          <p>Copy all {DAYS[activeDay]} windows to:</p>
          {DAYS.map((day, index) => index === activeDay ? null : <label key={day}>
            <input type="checkbox" checked={targets.includes(index)} onChange={(event) => {
              if (week[index].length) { setCopyMessage(`${day} already has availability. Delete its windows using the trash icon first.`); return }
              setTargets((previous) => event.target.checked ? [...previous, index] : previous.filter((value) => value !== index))
            }} />{day}{week[index].length > 0 && <span className="av-muted"> — already has availability</span>}
          </label>)}
          <button className="av-button" type="button" onClick={copyToDays}>Copy selected days</button>
        </div>}
        {copyMessage && <p role="status">{copyMessage}</p>}
      </div>
      <section className="av-editor" aria-label={`${DAYS[activeDay]} availability`}>
        <h2>{DAYS[activeDay]}</h2>
        {!week[activeDay].length && <p>No availability selected for this day.</p>}
        {week[activeDay].map((window, index) => <div className="av-window" key={`${activeDay}-${index}`}>
          {['from', 'to'].map((field) => <TimeSelect key={field} label={field === 'from' ? 'From' : 'To'} id={`${DAYS[activeDay]} window ${index + 1} ${field}`} value={window[field]} onChange={(time) => updateWindows(activeDay, week[activeDay].map((entry, position) => position === index ? { ...entry, [field]: time } : entry))} />)}
          <button className="av-trash" type="button" aria-label={`Delete ${DAYS[activeDay]} window ${index + 1}`} onClick={() => updateWindows(activeDay, week[activeDay].filter((_, position) => position !== index))}><TrashIcon /></button>
        </div>)}
        <button className="av-text-button" type="button" onClick={() => updateWindows(activeDay, [...week[activeDay], blankWindow()])}>+ Add availability window</button>
        <p className="av-muted">To 12:00 AM means midnight at the end of this day.</p>
      </section>
      {error && <p className="av-error" role="alert">{error}</p>}
      <footer className="av-actions">
        <button className="av-button" type="button" onClick={() => openMode('current')}>Cancel</button>
        <button className="av-button av-primary" type="button" onClick={reviewRequest}>Submit new availability request</button>
      </footer>
    </section>}

    {mode === 'review' && summary && <section className="av-card">
      <p><strong>Period starting:</strong> {displayDate(summary.periodStart)}, 12:00 AM Toronto time.</p>
      <AvailabilityWeek days={summary.days} />
      {summary.days.every((day) => !day.windows.length) && <p className="av-notice">This request declares no availability on any day of the week.</p>}
      <p>Your current availability stays in effect until this request is approved and its starting date has arrived.</p>
      {error && <p className="av-error" role="alert">{error}</p>}
      <footer className="av-actions">
        {uncertain ? (
          <Link
            className="av-button"
            to={ROUTES.EMPLOYEE_REQUESTS}
            aria-disabled={submitting}
            onClick={(event) => {
              if (submitting) event.preventDefault()
            }}
          >
            Check my requests
          </Link>
        ) : (
          <button
            className="av-button"
            type="button"
            disabled={submitting}
            onClick={() => openMode('edit')}
          >
            Back to edit
          </button>
        )}

        <button
          className="av-button av-primary"
          type="button"
          disabled={submitting}
          onClick={confirmRequest}
        >
          {submitting
            ? 'Submitting…'
            : uncertain
              ? 'Retry same request'
              : 'Confirm'}
        </button>
      </footer>
    </section>}
  </section>
}
