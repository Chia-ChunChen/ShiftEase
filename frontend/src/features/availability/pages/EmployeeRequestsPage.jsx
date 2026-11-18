import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import AvailabilityWeek from '../components/AvailabilityWeek.jsx'
import { displayDate } from '../availabilityRules.js'
import { getMyAvailabilityRequests } from '../services/availabilityRequestService.js'
import './AvailabilityPage.css'

function EmployeeRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadRequests() {
      setLoading(true)
      setError('')

      try {
        const result = await getMyAvailabilityRequests({
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setRequests(
            [...result].sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() -
                new Date(a.submittedAt).getTime(),
            ),
          )
        }
      } catch (failure) {
        if (failure.name !== 'AbortError') {
          setError(failure.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadRequests()

    return () => controller.abort()
  }, [reload])

  return (
    <section className="av-page">
      <header className="av-page-header">
        <div>
          <p className="av-eyebrow">Employee workspace</p>
          <h1>Requests</h1>
          <p>View your availability requests and their approval status.</p>
        </div>

        <button
          className="av-button"
          type="button"
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
        >
          {loading ? 'Loading…' : 'Refresh requests'}
        </button>
      </header>

      {loading ? (
        <p role="status">Loading your requests…</p>
      ) : error ? (
        <p className="av-error" role="alert">
          {error}
        </p>
      ) : requests.length === 0 ? (
        <section className="av-card">
          <p>You don't have any requests.</p>
          <Link className="av-text-button" to={ROUTES.EMPLOYEE_AVAILABILITY}>
            Go to my availability
          </Link>
        </section>
      ) : (
        requests.map((request) => {
          const pending = request.status === 'pending'

          return (
            <article className="av-card" key={request._id}>
              <header className="av-request-heading">
                <h2>Availability request</h2>

                <span
                  className={`av-status ${
                    pending ? 'av-status--pending' : 'av-status--approved'
                  }`}
                >
                  {pending ? 'Pending' : 'Approved'}
                </span>
              </header>

              <p>
                <strong>Period starting:</strong>{' '}
                {displayDate(request.periodStart)}
              </p>

              <p className="av-muted">
                Submitted:{' '}
                {new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'America/Toronto',
                }).format(new Date(request.submittedAt))}
                {' · Toronto time'}
              </p>

              <AvailabilityWeek days={request.days} />

              {pending ? (
                <p className="av-muted">Waiting for manager approval.</p>
              ) : (
                <p className="av-muted">
                  Approved. Availability takes effect once its starting
                  date has arrived.
                </p>
              )}
            </article>
          )
        })
      )}
    </section>
  )
}

export default EmployeeRequestsPage