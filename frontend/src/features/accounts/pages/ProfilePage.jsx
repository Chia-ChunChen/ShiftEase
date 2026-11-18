import { useEffect, useState } from 'react'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { requestJson } from '../../../shared/services/apiClient.js'
import { validatePassword } from '../accountValidation.js'
import './CreateAccountPage.css'

function ProfilePage({ user, onPasswordChanged }) {
  const [employee, setEmployee] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (user.role !== 'Employee') return
    const abort = new AbortController()
    requestJson('/api/users/me', { signal: abort.signal })
      .then(profile => setEmployee(profile.employee))
      .catch(error => {
        if (error.name !== 'AbortError') setProfileError(error.message)
      })
    return () => abort.abort()
  }, [user.role])

  async function handleSubmit(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const currentPassword = values.get('currentPassword')
    const newPassword = values.get('newPassword')
    const invalid = validatePassword(newPassword)
    if (invalid || newPassword !== values.get('confirmPassword')) {
      setError(invalid || 'The new passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await requestJson('/api/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } })
      onPasswordChanged()
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-page">
      <header className="page-header">
        <h1>My profile</h1>
        <p>{employee?.name || user.name} · {user.email}</p>
        {employee && <p>{employee.position} · {employee.phone}</p>}
        <FeedbackMessage variant="error">{profileError}</FeedbackMessage>
      </header>
      <form className="account-form" onSubmit={handleSubmit}>
        <h2>Change password</h2>
        <p>{user.mustChangePassword
          ? 'Change your temporary password to continue.'
          : 'After changing your password, sign in again.'}</p>
        <label className="form-field">Current password
          <input name="currentPassword" type="password" autoComplete="current-password" required />
        </label>
        <label className="form-field">New password
          <input name="newPassword" type="password" autoComplete="new-password" required />
        </label>
        <label className="form-field">Confirm new password
          <input name="confirmPassword" type="password" autoComplete="new-password" required />
        </label>
        <FeedbackMessage variant="error">{error}</FeedbackMessage>
        <button className="button button--primary" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}

export default ProfilePage
