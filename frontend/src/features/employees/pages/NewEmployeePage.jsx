import { useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { postJson } from '../../../shared/services/apiClient.js'
import TemporaryCredentials from '../../accounts/components/TemporaryCredentials.jsx'
import './NewEmployeePage.css'

function NewEmployeePage() {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [credentials, setCredentials] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setBusy(true)
    setFeedback(null)
    setCredentials(null)
    try {
      const result = await postJson('/api/employees', values)
      setFeedback({ variant: 'success', message: result.message })
      if (result.temporaryPassword) {
        setCredentials({ email: result.data.email, password: result.temporaryPassword })
      }
      form.reset()
    } catch (error) {
      setFeedback({ variant: 'error', message: error.message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="employee-page" aria-labelledby="employee-page-title">
      <header className="page-header">
        <p className="page-eyebrow">Team management</p>
        <h1 id="employee-page-title">Create employee</h1>
        <p>Add the employee’s contact and position details.</p>
      </header>

      <form className="employee-form" onSubmit={handleSubmit} onChange={() => {
        setFeedback(null)
        setCredentials(null)
      }}>
        <div className="employee-form__grid">
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" required />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required />
          </div>

          <div className="form-field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" name="phone" type="tel" required />
          </div>

          <div className="form-field">
            <label htmlFor="position">Position</label>
            <input id="position" name="position" type="text" required />
          </div>
        </div>

        <FeedbackMessage variant={feedback?.variant}>{feedback?.message}</FeedbackMessage>
        <TemporaryCredentials credentials={credentials} />
        <div className="employee-form__actions">
          <Link className="button button--secondary" to={ROUTES.MANAGER_HOME}>Cancel</Link>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save employee'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default NewEmployeePage