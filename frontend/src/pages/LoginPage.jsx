import { useState } from 'react'
import FeedbackMessage from '../shared/components/FeedbackMessage.jsx'
import { postJson } from '../shared/services/apiClient.js'
import './LoginPage.css'

function LoginPage({ onSignIn }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') || '').trim()
    const password = String(values.get('password') || '')

    setBusy(true)
    setError('')

    try {
      const result = await postJson('/api/users/login', {
        email,
        password,
      })

      const validRoles = ['Administrator', 'Manager', 'Employee']

      if (!result?.user || !validRoles.includes(result.user.role)) {
        throw new Error(
          'The server did not return a valid user account.',
        )
      }

      onSignIn(result.user)
    } catch (error) {
      setError(error.message || 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="login-page" aria-labelledby="login-title">
      <div className="login-card">
        <p className="login-brand">ShiftEase</p>
        <h1 id="login-title">Welcome back</h1>
        <p>Sign in with the email address assigned to your account.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <FeedbackMessage variant="error">{error}</FeedbackMessage>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-help">
          Need an account? Contact your administrator.
        </p>
      </div>
    </section>
  )
}

export default LoginPage
