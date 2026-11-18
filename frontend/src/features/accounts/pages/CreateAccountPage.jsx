import { useState } from 'react'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { validatePassword } from '../accountValidation.js'
import { postJson } from '../../../shared/services/apiClient.js'
import TemporaryCredentials from '../components/TemporaryCredentials.jsx'
import './CreateAccountPage.css'

function CreateAccountPage() {
  const [busy, setBusy] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [feedback, setFeedback] = useState({
    variant: '',
    message: '',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setCredentials(null)
    const passwordError = values.temporaryPassword && validatePassword(values.temporaryPassword)
    if (passwordError) {
      setFeedback({ variant: 'error', message: passwordError })
      return
    }

    setBusy(true)
    setFeedback({ variant: '', message: '' })
    try {
      const result = await postJson('/api/users', values)
      setCredentials({ email: result.user.email, password: result.temporaryPassword })
      setFeedback({ variant: 'success', message: result.message })
      form.reset()
    } catch (error) {
      setFeedback({ variant: 'error', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-page" aria-labelledby="account-page-title">
      <header className="page-header">
        <p className="page-eyebrow">User management</p>
        <h1 id="account-page-title">Create user account</h1>
        <p>Create an account and assign its role.</p>
      </header>

      <form
        className="account-form"
        onSubmit={handleSubmit}
        onChange={() => {
          setFeedback({ variant: '', message: '' })
          setCredentials(null)
        }}
      >
        <div className="form-field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" type="text" autoComplete="name" required />
        </div>

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
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue="" required>
            <option value="" disabled>Select a role</option>
            <option value="Administrator">Administrator</option>
            <option value="Manager">Manager</option>
            <option value="Employee">Employee</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="temporaryPassword">Temporary password</label>
          <input
            id="temporaryPassword"
            name="temporaryPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Leave blank to generate one"
          />
        </div>

        <FeedbackMessage variant={feedback.variant}>
          {feedback.message}
        </FeedbackMessage>
        <TemporaryCredentials credentials={credentials} />

        <div className="account-form__actions">
          <button className="button button--secondary" type="reset" disabled={busy} onClick={() => {
            setCredentials(null)
            setFeedback({ variant: '', message: '' })
          }}>
            Clear
          </button>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Create account'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default CreateAccountPage