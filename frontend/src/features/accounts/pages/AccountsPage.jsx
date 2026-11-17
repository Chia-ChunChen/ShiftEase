import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { requestJson } from '../../../shared/services/apiClient.js'
import './CreateAccountPage.css'

function AccountsPage() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const abort = new AbortController()
    requestJson('/api/users', { signal: abort.signal })
      .then(result => setUsers(result.users))
      .catch(error => {
        if (error.name !== 'AbortError') setError(error.message)
      })
    return () => abort.abort()
  }, [])

  return (
    <section className="account-page">
      <header className="page-header">
        <h1>User accounts</h1>
        <Link className="button button--primary" to={ROUTES.ADMIN_CREATE_ACCOUNT}>Create account</Link>
      </header>
      <FeedbackMessage variant="error">{error}</FeedbackMessage>
      {!users && !error && <p>Loading accounts…</p>}
      {users?.length === 0 && <p>No accounts found.</p>}
      {users?.length > 0 && (
        <ul>
          {users.map(user => <li key={user._id}>{user.name} · {user.email} · {user.role}</li>)}
        </ul>
      )}
    </section>
  )
}

export default AccountsPage
