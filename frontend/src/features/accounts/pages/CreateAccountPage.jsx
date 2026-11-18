import { useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { validateTemporaryPassword } from '../accountValidation.js'
import './CreateAccountPage.css'

function CreateAccountPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get('name') || '').trim()
    const password = String(formData.get('temporaryPassword') || '')

    if (!name) {
      setFeedback({
        variant: 'error',
        message: 'Enter a full name. Spaces alone are not accepted.',
      })
      form.elements.namedItem('name').focus()
      return
    }

    const passwordError = validateTemporaryPassword(password)

    if (passwordError) {
      setFeedback({ variant: 'error', message: passwordError })
      form.elements.namedItem('temporaryPassword').focus()
      return
    }

    setFeedback({
      variant: 'success',
      message:
        'Details are valid. No account has been saved.',
    })
  }

  function handleReset() {
    setFeedback(null)
    setShowPassword(false)
  }

  return (
    <section className="account-page" aria-labelledby="account-page-title">
      <header className="page-header">
        <p className="page-eyebrow">User management</p>
        <h1 id="account-page-title">Create user account</h1>
        <p>Create an account and assign its role. All fields are required.</p>
      </header>

      <form
        className="account-form"
        onSubmit={handleSubmit}
        onReset={handleReset}
        onChange={() => setFeedback(null)}
      >
        <div className="form-field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
          />
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
          <select
            id="role"
            name="role"
            defaultValue=""
            aria-describedby="account-role-help"
            required
          >
            <option value="" disabled>Select a role</option>
            <option value="Administrator">Administrator</option>
            <option value="Manager">Manager</option>
            <option value="Employee">Employee</option>
          </select>
          <p className="account-form__help" id="account-role-help">
            Select the access level required for this user.
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="temporaryPassword">Temporary password</label>
          <input
            id="temporaryPassword"
            name="temporaryPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-describedby="account-password-help"
            minLength={8}
            maxLength={72}
            required
          />
          <p className="account-form__help" id="account-password-help">
            Use 8–72 characters, including a letter and a number.
            Accented characters and emoji may reach the 72-byte limit sooner.
          </p>
          <button
            className="account-form__password-toggle"
            type="button"
            aria-controls="temporaryPassword"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? 'Hide password' : 'Show password'}
          </button>
        </div>

        {feedback && (
          <div className="account-form__feedback">
            <FeedbackMessage variant={feedback.variant}>
              {feedback.message}
            </FeedbackMessage>
          </div>
        )}

        <div className="account-form__actions">
          <Link
            className="button button--secondary"
            to={ROUTES.ADMIN_ACCOUNTS}
          >
            Cancel
          </Link>
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