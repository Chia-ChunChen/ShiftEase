import { useEffect, useState } from 'react'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { requestJson } from '../../../shared/services/apiClient.js'
import { validatePassword } from '../accountValidation.js'
import './ProfilePage.css'

function ProfilePage({ user, onPasswordChanged }) {
  const [employee, setEmployee] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState({})

  useEffect(() => {
    if (user.role !== 'Employee') return

    const abort = new AbortController()

    requestJson('/api/users/me', { signal: abort.signal })
      .then(profile => setEmployee(profile.employee))
      .catch(error => {
        if (error.name !== 'AbortError') {
          setProfileError(error.message)
        }
      })

    return () => abort.abort()
  }, [user.role])

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    const values = new FormData(event.currentTarget)
    const currentPassword = values.get('currentPassword')
    const newPassword = values.get('newPassword')
    const confirmPassword = values.get('confirmPassword')
    const invalid = validatePassword(newPassword)

    if (invalid || newPassword !== confirmPassword) {
      setError(invalid || 'The new passwords do not match.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await requestJson('/api/users/me/password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      })

      setVisiblePasswords({})
      onPasswordChanged()
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="manage-account">
      <header className="manage-account__header">
        <p className="manage-account__eyebrow">Account settings</p>
        <h1>Manage account</h1>
        <p className="manage-account__identity">
          {employee?.name || user.name}
          <span>{user.email}</span>
        </p>
        <FeedbackMessage variant="error">
          {profileError}
        </FeedbackMessage>
      </header>

      <form
        className="password-card"
        onSubmit={handleSubmit}
        aria-busy={busy}
        aria-labelledby="password-card-title"
      >
        <header className="password-card__header">
          <h2 id="password-card-title">Change password</h2>
          <p>
            {user.mustChangePassword
              ? 'Choose a personal password to replace your temporary one.'
              : 'Update the password you use to sign in to ShiftEase.'}
          </p>
        </header>

        <div className="password-card__fields">
          {[
            {
              name: 'currentPassword',
              label: 'Current password',
              autoComplete: 'current-password',
            },
            {
              name: 'newPassword',
              label: 'New password',
              autoComplete: 'new-password',
            },
            {
              name: 'confirmPassword',
              label: 'Confirm new password',
              autoComplete: 'new-password',
            },
          ].map(({ name, label, autoComplete }) => (
            <div className="password-field" key={name}>
              <label htmlFor={`account-${name}`}>{label}</label>

              <div className="password-field__control">
                <input
                  id={`account-${name}`}
                  name={name}
                  type={visiblePasswords[name] ? 'text' : 'password'}
                  autoComplete={autoComplete}
                  aria-describedby={
                    name === 'newPassword' ? 'password-requirements' : undefined
                  }
                  disabled={busy}
                  required
                />

                <button
                  className="password-field__toggle"
                  type="button"
                  aria-label={`${visiblePasswords[name] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                  aria-controls={`account-${name}`}
                  aria-pressed={Boolean(visiblePasswords[name])}
                  disabled={busy}
                  onClick={() =>
                    setVisiblePasswords(current => ({
                      ...current,
                      [name]: !current[name],
                    }))
                  }
                >
                  {visiblePasswords[name] ? 'Hide' : 'Show'}
                </button>
              </div>

              {name === 'newPassword' && (
                <p className="password-field__help" id="password-requirements">
                  Use 8–72 characters with at least one letter and one number.
                  Accented characters and emoji count toward a 72-byte limit.
                </p>
              )}
            </div>
          ))}
        </div>

        <FeedbackMessage variant="error">
          {error}
        </FeedbackMessage>

        <footer className="password-card__footer">
          <button
            className="password-card__submit"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Updating password…' : 'Update password'}
          </button>
        </footer>
      </form>
    </section>
  )
}

export default ProfilePage