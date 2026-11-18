import {
  DAYS,
  DAY_NUMBERS,
  displayTime,
} from '../availabilityRules.js'

export default function AvailabilityWeek({ days }) {
  return (
    <div className="av-week-scroll">
      <table className="av-week-table">
        <caption className="av-sr-only">
          Weekly availability, Monday to Sunday.
        </caption>

        <thead>
          <tr>
            {DAYS.map((day) => (
              <th scope="col" key={day}>
                {day}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr>
            {DAYS.map((day, index) => {
              const windows =
                days.find(
                  (entry) => entry.dayOfWeek === DAY_NUMBERS[index],
                )?.windows ?? []

              return (
                <td
                  key={day}
                  className={windows.length ? 'av-day-available' : ''}
                >
                  {windows.length ? (
                    windows.map((window, windowIndex) => (
                      <div className="av-time-pair" key={windowIndex}>
                        <span>{displayTime(window.startTime)}</span>
                        <span aria-hidden="true">–</span>
                        <span>{displayTime(window.endTime)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="av-muted">Unavailable</span>
                  )}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}