import { useState } from 'react'
import './NewSchedulePage.css'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
})

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const monthDayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

function getDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getWeekDates(weekOffset) {
  const today = new Date()
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const daysSinceMonday = (monday.getDay() + 6) % 7

  monday.setDate(monday.getDate() - daysSinceMonday + weekOffset * 7)

  return Array.from({ length: 7 }, (_, index) =>
    new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + index,
    ),
  )
}

function NewSchedulePage({ saveFeedback = null }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDates, setSelectedDates] = useState([])
  const [shiftHours, setShiftHours] = useState({})
  const weekDates = getWeekDates(weekOffset)

  function toggleDate(date) {
    const dateKey = getDateKey(date)

    setSelectedDates((currentDates) =>
      currentDates.includes(dateKey)
        ? currentDates.filter((currentDate) => currentDate !== dateKey)
        : [...currentDates, dateKey].sort(),
    )
  }

  function updateShiftHours(dateKey, field, value) {
    setShiftHours((currentHours) => ({
      ...currentHours,
      [dateKey]: {
        ...currentHours[dateKey],
        [field]: value,
      },
    }))
  }

  function changeWeek(direction) {
    setWeekOffset((currentOffset) => currentOffset + direction)
    setSelectedDates([])
  }

  return (
    <section className="schedule-page" aria-labelledby="schedule-page-title">
      <header className="schedule-page__header">
        <p className="schedule-page__eyebrow">Scheduling</p>
        <h1 id="schedule-page-title">Create weekly schedule</h1>
        <p>Select the dates and hours for this week’s shifts.</p>
      </header>

      <div className="schedule-page__layout">
        <section className="schedule-calendar" aria-label="Weekly calendar">
          <div className="schedule-calendar__navigation">
            <button type="button" onClick={() => changeWeek(-1)}>
              Previous week
            </button>

            <h2>
              {monthDayFormatter.format(weekDates[0])}
              {' - '}
              {monthDayFormatter.format(weekDates[6])}
            </h2>

            <button type="button" onClick={() => changeWeek(1)}>
              Next week
            </button>
          </div>

          <div className="schedule-calendar__days">
            {weekDates.map((date) => {
              const dateKey = getDateKey(date)
              const isSelected = selectedDates.includes(dateKey)

              return (
                <button
                  key={dateKey}
                  className={`schedule-calendar__day${isSelected ? ' is-selected' : ''}`}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${fullDateFormatter.format(date)}${
                    isSelected ? ', selected' : ''
                  }`}
                  onClick={() => toggleDate(date)}
                >
                  <span>{weekdayFormatter.format(date)}</span>
                  <strong>{date.getDate()}</strong>
                </button>
              )
            })}
          </div>

          <p className="schedule-calendar__selection" role="status">
            {selectedDates.length === 0
              ? 'Select one or more shift dates.'
              : `${selectedDates.length} ${
                  selectedDates.length === 1 ? 'date' : 'dates'
                } selected.`}
          </p>

          {selectedDates.map((dateKey) => {
            const date = new Date(`${dateKey}T00:00:00`)
            const hours = shiftHours[dateKey] ?? {
              startTime: '',
              endTime: '',
            }

            return (
              <article className="schedule-date-card" key={dateKey}>
                <h3>{fullDateFormatter.format(date)}</h3>

                <div className="schedule-date-card__times">
                  <div className="form-field">
                    <label htmlFor={`${dateKey}-start`}>Start time</label>
                    <input
                      id={`${dateKey}-start`}
                      type="time"
                      value={hours.startTime}
                      onChange={(event) =>
                        updateShiftHours(
                          dateKey,
                          'startTime',
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor={`${dateKey}-end`}>End time</label>
                    <input
                      id={`${dateKey}-end`}
                      type="time"
                      value={hours.endTime}
                      onChange={(event) =>
                        updateShiftHours(
                          dateKey,
                          'endTime',
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </article>
            )
          })}

          <FeedbackMessage variant={saveFeedback?.variant}>
            {saveFeedback?.message}
          </FeedbackMessage>

          <button className="button button--primary" type="button">
            Save weekly schedule
          </button>
        </section>

        <aside className="schedule-preview">
          <h2>Employee assignment</h2>
          <p>This area is reserved for the employee selection interface.</p>
        </aside>
      </div>
    </section>
  )
}

export default NewSchedulePage