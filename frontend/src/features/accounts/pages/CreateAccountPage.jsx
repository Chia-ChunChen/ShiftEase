import { useState } from 'react'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { validateTemporaryPassword } from '../accountValidation.js'
import './CreateAccountPage.css'

function CreateAccountPage() {
  const [feedback, setFeedback] = useState({
    variant: '',
    message: '',
  })

  function handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const passwordError = validateTemporaryPassword(
      formData.get('temporaryPassword'),
    )

    if (passwordError) {
      setFeedback({ variant: 'error', message: passwordError })
      return
    }

    setFeedback({
      variant: 'success',
      message: 'Details are valid. The account has not been saved.',
    })
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
        onChange={() => setFeedback({ variant: '', message: '' })}
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
            required
          />
        </div>

        <FeedbackMessage variant={feedback.variant}>
          {feedback.message}
        </FeedbackMessage>

        <div className="account-form__actions">
          <button className="button button--secondary" type="reset">
            Clear
          </button>
          <button className="button button--primary" type="submit">
            Validate details
          </button>
        </div>
      </form>
    </section>
  )
}

export default CreateAccountPage