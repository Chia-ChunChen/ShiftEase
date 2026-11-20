import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import { requestJson } from '../../../shared/services/apiClient.js'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import './EmployeeProfilePage.css'

function EmployeeProfilePage() {
  const [employee, setEmployee] = useState(null)
  const [draft, setDraft] = useState({ phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const abort = new AbortController()

    requestJson('/api/employees/me', { signal: abort.signal })
      .then(result => {
        if (abort.signal.aborted) return

        if (!result?.employee?._id) {
          throw new Error('Your employee profile is unavailable.')
        }

        setEmployee(result.employee)
        setDraft({ phone: result.employee.phone || '' })
        setLoadError('')
      })
      .catch(error => {
        if (!abort.signal.aborted) {
          setLoadError(error.message)
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setLoading(false)
        }
      })

    return () => abort.abort()
  }, [attempt])

  function startEditing() {
    setDraft({ phone: employee.phone || '' })
    setFeedback(null)
    setEditing(true)
  }

  function cancelEditing() {
    setDraft({ phone: employee.phone || '' })
    setEditing(false)
    setFeedback(null)
  }

  function updatePhone(value) {
    setDraft({ phone: value })
    setFeedback(null)
  }

  async function handleSave(event) {
    event.preventDefault()
    if (saving) return

    const phone = draft.phone.trim()

    if (
      !/^[0-9()\s-]+$/.test(phone) ||
      phone.replace(/\D/g, '').length !== 10
    ) {
      setFeedback({
        variant: 'error',
        message: 'Enter a 10-digit phone number.',
      })
      return
    }

    if (phone === employee.phone) {
      setEditing(false)
      setFeedback(null)
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const result = await requestJson('/api/employees/me', {
        method: 'PATCH',
        body: { phone },
      })

      if (!result?.employee?._id) {
        throw new Error(
          'The server did not confirm the update. Reload your profile before trying again.',
        )
      }

      setEmployee(result.employee)
      setDraft({ phone: result.employee.phone || '' })
      setEditing(false)
      setFeedback({
        variant: 'success',
        message: 'Your phone number was updated successfully.',
      })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error.message || 'Unable to update your phone number.',
      })
    } finally {
      setSaving(false)
    }
  }

  function retryLoading() {
    setLoading(true)
    setLoadError('')
    setAttempt(value => value + 1)
  }

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <header className="profile-page__header">
        <p className="profile-page__eyebrow">Employee workspace</p>

        <div className="profile-page__title-row">
          <h1 id="profile-title">My profile</h1>

          <Link
            className="profile-page__link profile-page__link--secondary"
            to={ROUTES.PROFILE}
          >
            Manage account
          </Link>
        </div>

        <p>
          View your personal and work information and update your phone
          number.
        </p>
      </header>

      {loading ? (
        <p className="profile-page__notice" role="status">
          Loading your profile…
        </p>
      ) : loadError ? (
        <div className="profile-page__notice">
          <FeedbackMessage variant="error">
            {loadError}
          </FeedbackMessage>

          <button
            className="profile-page__link profile-page__link--secondary"
            type="button"
            onClick={retryLoading}
          >
            Try again
          </button>
        </div>
      ) : employee && (
        <div className="profile-page__grid">
          <section
            className="profile-card"
            aria-labelledby="personal-title"
          >
            <div className="profile-card__heading">
              <h2 id="personal-title">Personal information</h2>

              {!editing && (
                <button
                  className="profile-page__link profile-page__link--secondary"
                  type="button"
                  onClick={startEditing}
                >
                  Edit information
                </button>
              )}
            </div>

            <dl className="profile-details">
              <div>
                <dt>Full name</dt>
                <dd>{employee.name || 'Not available'}</dd>
              </div>

              <div>
                <dt>Corporate email</dt>
                <dd>{employee.email || 'Not available'}</dd>
              </div>
            </dl>

            {editing ? (
              <form
                className="profile-contact-form"
                onSubmit={handleSave}
                aria-busy={saving}
              >
                <div className="profile-contact-form__field">
                  <label htmlFor="profile-phone">Phone number</label>

                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={draft.phone}
                    onChange={event => updatePhone(event.target.value)}
                    disabled={saving}
                    aria-describedby="profile-phone-help"
                    required
                  />

                  <p id="profile-phone-help">
                    Enter 10 digits, without a country code.
                  </p>
                </div>

                <div className="profile-contact-form__actions">
                  <button
                    className="profile-page__link profile-page__link--secondary"
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    className="profile-page__link profile-page__link--primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="profile-details profile-contact-details">
                <div>
                  <dt>Phone number</dt>
                  <dd>{employee.phone || 'Not available'}</dd>
                </div>
              </dl>
            )}

            {feedback && (
              <div className="profile-contact-feedback">
                <FeedbackMessage variant={feedback.variant}>
                  {feedback.message}
                </FeedbackMessage>
              </div>
            )}
          </section>

          <section className="profile-card" aria-labelledby="work-title">
            <h2 id="work-title">Work information</h2>

            <dl className="profile-details">
              <div>
                <dt>Position</dt>
                <dd>{employee.position || 'Not available'}</dd>
              </div>
            </dl>

            <p className="profile-card__help">
              Your corporate email is managed by your organization.
              Contact your administrator to update your name, position,
              role or legal information.
            </p>
          </section>
        </div>
      )}

      <nav className="profile-page__actions" aria-label="Profile navigation">
        <Link
          className="profile-page__link profile-page__link--secondary"
          to={ROUTES.EMPLOYEE_HOME}
        >
          Back to home
        </Link>

        <Link
          className="profile-page__link profile-page__link--primary"
          to={ROUTES.EMPLOYEE_AVAILABILITY}
        >
          Manage availability
        </Link>
      </nav>
    </section>
  )
}

export default EmployeeProfilePage