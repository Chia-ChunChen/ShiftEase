import { useState } from 'react'
import './AvailabilityPage.css'

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

  return Array.from({ length: 7 }, (_, index) => {
    return new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + index,
    )
  })
}

function AvailabilityPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDates, setSelectedDates] = useState([])
  const weekDates = getWeekDates(weekOffset)
  const [hoursByDate, setHoursByDate] = useState({})

  function toggleDate(date) {
    const dateKey = getDateKey(date)

    setSelectedDates((currentDates) =>
      currentDates.includes(dateKey)
        ? currentDates.filter((selectedDate) => selectedDate !== dateKey)
        : [...currentDates, dateKey].sort(),
    )
    
  }

  function updateHours(dateKey, field, value) {
    setHoursByDate((currentHours) => ({
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
    <section
      className="availability-page"
      aria-labelledby="availability-page-title"
    >
      <header className="availability-page__header">
        <p className="availability-page__eyebrow">Availability</p>
        <h1 id="availability-page-title">Set your weekly availability</h1>
        <p>Select the dates when you are available to work.</p>
      </header>

      <section className="availability-calendar" aria-label="Weekly calendar">
        <div className="availability-calendar__navigation">
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

        <div className="availability-calendar__days">
          {weekDates.map((date) => {
            const dateKey = getDateKey(date)
            const isSelected = selectedDates.includes(dateKey)

            return (
              <button
                key={dateKey}
                className={`availability-calendar__day${isSelected ? ' is-selected' : ''}`}
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

        <p className="availability-calendar__selection" role="status">
          {selectedDates.length === 0
            ? 'Select one or more available dates.'
            : `${selectedDates.length} ${
                selectedDates.length === 1 ? 'day' : 'days'
              } selected.`}
        </p>
        {selectedDates.length > 0 && (
          <section
            className="availability-details"
            aria-labelledby="availability-details-title"
          >
            <header>
              <h2 id="availability-details-title">Available hours</h2>
              <p>Set a separate time range for each selected date.</p>
            </header>

            <div className="availability-details__list">
              {selectedDates.map((dateKey) => {
                const date = new Date(`${dateKey}T00:00:00`)
                const hours = hoursByDate[dateKey] ?? {
                  startTime: '',
                  endTime: '',
                }

                return (
                  <article className="availability-date-card" key={dateKey}>
                    <h3>{fullDateFormatter.format(date)}</h3>

                    <div className="availability-date-card__times">
                      <div className="form-field">
                        <label htmlFor={`${dateKey}-start`}>Start time</label>
                        <input
                          id={`${dateKey}-start`}
                          name={`${dateKey}.startTime`}
                          type="time"
                          value={hours.startTime}
                          onChange={(event) =>
                            updateHours(dateKey, 'startTime', event.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor={`${dateKey}-end`}>End time</label>
                        <input
                          id={`${dateKey}-end`}
                          name={`${dateKey}.endTime`}
                          type="time"
                          value={hours.endTime}
                          onChange={(event) =>
                            updateHours(dateKey, 'endTime', event.target.value)
                          }
                          required
                        />
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </section>
    </section>
  )
}

export default AvailabilityPage