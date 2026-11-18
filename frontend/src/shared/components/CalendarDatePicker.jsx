import { useState } from 'react'
import './CalendarDatePicker.css'

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
    new Date(2026, month, 1),
  ),
)

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getBlockStart(year) {
  return 2020 + Math.floor((year - 2020) / 6) * 6
}

function CalendarDatePicker({ initialDate, onSelect, onCancel }) {
  const [view, setView] = useState('days')
  const [year, setYear] = useState(initialDate.getFullYear())
  const [month, setMonth] = useState(initialDate.getMonth())
  const [blockStart, setBlockStart] = useState(
    getBlockStart(initialDate.getFullYear()),
  )
  const [rangeStart, setRangeStart] = useState(
    getBlockStart(initialDate.getFullYear()),
  )

  const today = new Date()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function move(direction) {
    if (view === 'days') {
      const next = new Date(year, month + direction, 1)
      setYear(next.getFullYear())
      setMonth(next.getMonth())
    } else if (view === 'months') {
      setYear((current) => current + direction)
    } else if (view === 'years') {
      setBlockStart((current) => current + direction * 6)
    } else {
      setRangeStart((current) => current + direction * 36)
    }
  }

  function openParentView() {
    if (view === 'days') {
      setView('months')
    } else if (view === 'months') {
      setRangeStart(getBlockStart(year))
      setView('ranges')
    } else if (view === 'years') {
      setRangeStart(blockStart)
      setView('ranges')
    }
  }

  const heading =
    view === 'days'
      ? `${monthNames[month]} ${year}`
      : view === 'months'
        ? String(year)
        : view === 'years'
          ? `${blockStart}–${blockStart + 5}`
          : `${rangeStart}–${rangeStart + 35}`

  const navigationUnit =
    view === 'days'
      ? 'month'
      : view === 'months'
        ? 'year'
        : view === 'years'
          ? 'six years'
          : 'year ranges'

  return (
    <section className="date-picker" aria-label="Choose a calendar date">
      <header className="date-picker__navigation">
        <button
          type="button"
          aria-label={`Previous ${navigationUnit}`}
          onClick={() => move(-1)}
        >
          ‹
        </button>

        {view === 'ranges' ? (
          <h2 aria-live="polite">{heading}</h2>
        ) : (
          <button
            className="date-picker__heading"
            type="button"
            onClick={openParentView}
            aria-label={
              view === 'days'
                ? `${heading}. Choose a month`
                : `${heading}. Choose a year range`
            }
          >
            {heading}
          </button>
        )}

        <button
          type="button"
          aria-label={`Next ${navigationUnit}`}
          onClick={() => move(1)}
        >
          ›
        </button>
      </header>

      <p className="date-picker__instruction" aria-live="polite">
        {view === 'days' && 'Select a date to open its week.'}
        {view === 'months' && 'Select a month, or select the year above.'}
        {view === 'ranges' && 'Select a six-year range.'}
        {view === 'years' && 'Select a year.'}
      </p>

      {view === 'days' && (
        <div className="date-picker__days">
          {weekdays.map((day) => (
            <span className="date-picker__weekday" key={day}>
              {day}
            </span>
          ))}

          {Array.from({ length: firstWeekday }, (_, index) => (
            <span key={`empty-${index}`} aria-hidden="true" />
          ))}

          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const date = new Date(year, month, day)
            const isToday =
              year === today.getFullYear() &&
              month === today.getMonth() &&
              day === today.getDate()

            return (
              <button
                key={day}
                className={isToday ? 'is-today' : ''}
                type="button"
                aria-current={isToday ? 'date' : undefined}
                aria-label={new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'full',
                }).format(date)}
                onClick={() => onSelect(date)}
              >
                {day}
              </button>
            )
          })}
        </div>
      )}

      {view === 'months' && (
        <div className="date-picker__options">
          {monthNames.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setMonth(index)
                setView('days')
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {view === 'ranges' && (
        <div className="date-picker__options">
          {Array.from({ length: 6 }, (_, index) => {
            const start = rangeStart + index * 6

            return (
              <button
                key={start}
                type="button"
                onClick={() => {
                  setBlockStart(start)
                  setView('years')
                }}
              >
                {start}–{start + 5}
              </button>
            )
          })}
        </div>
      )}

      {view === 'years' && (
        <div className="date-picker__options">
          {Array.from({ length: 6 }, (_, index) => {
            const optionYear = blockStart + index

            return (
              <button
                key={optionYear}
                type="button"
                onClick={() => {
                  setYear(optionYear)
                  setView('months')
                }}
              >
                {optionYear}
              </button>
            )
          })}
        </div>
      )}

      <footer className="date-picker__footer">
        <button type="button" onClick={onCancel}>
          Back to week
        </button>
        <button type="button" onClick={() => onSelect(new Date())}>
          Go to today
        </button>
      </footer>
    </section>
  )
}

export default CalendarDatePicker