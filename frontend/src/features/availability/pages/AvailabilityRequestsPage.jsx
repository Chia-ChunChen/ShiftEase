import { useEffect, useRef, useState } from 'react'
import AvailabilityWeek from '../components/AvailabilityWeek.jsx'
import { displayDate } from '../availabilityRules.js'
import { getPendingAvailabilityRequests, approveAvailabilityRequest } from '../services/availabilityRequestService.js'
import './AvailabilityPage.css'

export default function AvailabilityRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState('')
  const [reload, setReload] = useState(0)
  const busy = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError('')
      try {
        const result = await getPendingAvailabilityRequests({ signal: controller.signal })
        if (!controller.signal.aborted) setRequests(result)
      } catch (failure) {
        if (failure.name !== 'AbortError') setError(failure.message)
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [reload])

  async function approve(id) {
    if (busy.current) return
    busy.current = true; setBusyId(id); setError(''); setSuccess('')
    try {
      await approveAvailabilityRequest(id)
      setRequests((previous) => previous.filter((request) => request._id !== id))
      setSuccess('✓ Availability request approved.')
    } catch (failure) {
      setError(`${failure.message} Refresh the list before retrying if the result is uncertain.`)
    } finally { busy.current = false; setBusyId('') }
  }

  return <section className="av-page">
    <header className="av-page-header"><div><p className="av-eyebrow">Manager workspace</p><h1>Availability requests</h1></div><button className="av-button" disabled={loading || Boolean(busyId)} onClick={() => setReload((value) => value + 1)}>Refresh requests</button></header>
    {success && <p className="av-success" role="status">{success}</p>}
    {error && <p className="av-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading requests…</p> : !error && requests.length === 0 ? <p className="av-card">No pending availability requests.</p> : requests.map((request) => <article className="av-card" key={request._id}>
      <h2>{request.employee.name}</h2>
      <p>{request.employee.email}</p>
      <p><strong>Period starting:</strong> {displayDate(request.periodStart)}</p>
      <AvailabilityWeek days={request.days} />
      <footer className="av-actions"><button className="av-button av-primary" disabled={Boolean(busyId) || loading} onClick={() => approve(request._id)}>{busyId === request._id ? 'Approving…' : 'Approve request'}</button></footer>
    </article>)}
  </section>
}
