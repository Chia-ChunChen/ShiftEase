import { useState } from 'react'
import FeedbackMessage from '../shared/components/FeedbackMessage.jsx'
import { postJson } from '../shared/services/apiClient.js'
import './LoginPage.css'
import { setAccessToken } from '../shared/services/apiClient.js'

function LoginPage({ onSignIn }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const { email, password } = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    try {
      const result = await postJson('/api/users/login', { email, password })
      setAccessToken(result.token)
      onSignIn(result.user)
    } catch (error) {
      setError(error.message)
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
