import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import { createEmployee } from '../services/employeeService.js'
import TemporaryCredentials from '../../accounts/components/TemporaryCredentials.jsx'
import './NewEmployeePage.css'

const DRAFT_KEY = 'shiftease.newEmployeeDraft'

function emptyEmployee() {
  return {
    name: '',
    email: '',
    phone: '',
    position: '',
  }
}

function readEmployeeDraft() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}')
    const draft = emptyEmployee()

    for (const field of Object.keys(draft)) {
      if (typeof stored?.[field] === 'string') {
        draft[field] = stored[field]
      }
    }

    return draft
  } catch {
    return emptyEmployee()
  }
}

function saveEmployeeDraft(employee) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(employee))
  } catch {
    // The form remains usable when browser storage is unavailable.
  }
}

function clearEmployeeDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // Browser storage must not interrupt a confirmed save.
  }
}

function formatTitleCase(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-CA')
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, separator, letter) =>
        separator + letter.toLocaleUpperCase('en-CA'),
    )
}

function isValidPhone(value) {
  return (
    /^[0-9()\s-]+$/.test(value) &&
    value.replace(/\D/g, '').length === 10
  )
}

function formatPhone(value) {
  const trimmed = value.trim()

  if (!isValidPhone(trimmed)) return trimmed

  const digits = trimmed.replace(/\D/g, '')

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} - ${digits.slice(6)}`
}

function NewEmployeePage() {
  const navigate = useNavigate()
  const requestInProgress = useRef(false)
  const nameInputRef = useRef(null)

  const [employee, setEmployee] = useState(readEmployeeDraft)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [savedEmployee, setSavedEmployee] = useState(null)
  const [credentials, setCredentials] = useState(null)

  function updateField(field, value) {
    const updated = {
      ...employee,
      [field]: value,
    }

    setEmployee(updated)
    saveEmployeeDraft(updated)
    setFeedback(null)
  }

  function handleCancel() {
    if (requestInProgress.current) return

    clearEmployeeDraft()
    navigate(ROUTES.MANAGER_HOME)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (requestInProgress.current || savedEmployee) return

    const form = event.currentTarget

    const formattedEmployee = {
      name: formatTitleCase(employee.name),
      email: employee.email.trim(),
      phone: employee.phone.trim(),
      position: formatTitleCase(employee.position),
    }

    const labels = {
      name: 'Full name',
      email: 'Corporate email',
      phone: 'Phone number',
      position: 'Position',
    }

    for (const [field, value] of Object.entries(formattedEmployee)) {
      if (!value) {
        setFeedback({
          variant: 'error',
          message: `${labels[field]} is required. Spaces alone are not accepted.`,
        })
        form.elements.namedItem(field)?.focus()
        return
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formattedEmployee.email)) {
      setFeedback({
        variant: 'error',
        message: 'Enter a valid corporate email address.',
      })
      form.elements.namedItem('email')?.focus()
      return
    }

    if (!isValidPhone(formattedEmployee.phone)) {
      setFeedback({
        variant: 'error',
        message:
          'Enter a 10-digit phone number, for example (416) 555 - 0123. Use only digits, spaces, parentheses or hyphens.',
      })
      form.elements.namedItem('phone')?.focus()
      return
    }

    formattedEmployee.phone = formatPhone(formattedEmployee.phone)

    setEmployee(formattedEmployee)
    saveEmployeeDraft(formattedEmployee)

    requestInProgress.current = true
    setSaving(true)
    setFeedback(null)
    setCredentials(null)

    try {
      const result = await createEmployee(formattedEmployee)

      if (!result?.data?._id) {
        throw new Error(
          'The server did not confirm the employee record. Check whether it was created before submitting again.',
        )
      }

      clearEmployeeDraft()
      setSavedEmployee(result.data)

      setCredentials(
        result.temporaryPassword
          ? {
              email: result.data.email,
              password: result.temporaryPassword,
            }
          : null,
      )

      setFeedback({
        variant: 'success',
        message: result.temporaryPassword
          ? 'Employee and login account created successfully.'
          : 'Employee linked to the existing account. Its password was not changed.',
      })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error.message || 'Unable to save the employee.',
      })
    } finally {
      requestInProgress.current = false
      setSaving(false)
    }
  }

  function handleCreateAnother() {
    clearEmployeeDraft()
    setEmployee(emptyEmployee())
    setSavedEmployee(null)
    setFeedback(null)
    setCredentials(null)

    requestAnimationFrame(() => {
      nameInputRef.current?.focus()
    })
  }

  const fieldsDisabled = saving || Boolean(savedEmployee)

  return (
    <section className="employee-page" aria-labelledby="employee-page-title">
      <header className="page-header">
        <p className="page-eyebrow">Team management</p>
        <h1 id="employee-page-title">Create employee</h1>
        <p>
          Add the employee&apos;s contact and position details.
          All fields are required.
        </p>
      </header>

      <form
        className="employee-form"
        onSubmit={handleSubmit}
        aria-busy={saving}
      >
        <div className="employee-form__grid">
          <div className="form-field">
            <label htmlFor="employee-name">Full name</label>
            <input
              ref={nameInputRef}
              id="employee-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="ex. John Doe"
              value={employee.name}
              onChange={event =>
                updateField('name', event.target.value)
              }
              onBlur={event =>
                updateField('name', formatTitleCase(event.target.value))
              }
              disabled={fieldsDisabled}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="employee-email">Corporate email</label>
            <input
              id="employee-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ex. john.doe@example.com"
              value={employee.email}
              onChange={event =>
                updateField('email', event.target.value)
              }
              onBlur={event =>
                updateField('email', event.target.value.trim())
              }
              disabled={fieldsDisabled}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="employee-phone">Phone number</label>
            <input
              id="employee-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="ex. (416) 555 - 0123"
              aria-describedby="employee-phone-help"
              value={employee.phone}
              onChange={event =>
                updateField('phone', event.target.value)
              }
              onBlur={event =>
                updateField('phone', formatPhone(event.target.value))
              }
              disabled={fieldsDisabled}
              required
            />
            <p id="employee-phone-help" className="employee-form__help">
              Enter 10 digits, without a country code or extension.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="employee-position">Position</label>
            <input
              id="employee-position"
              name="position"
              type="text"
              autoComplete="organization-title"
              placeholder="ex. Cashier"
              value={employee.position}
              onChange={event =>
                updateField('position', event.target.value)
              }
              onBlur={event =>
                updateField(
                  'position',
                  formatTitleCase(event.target.value),
                )
              }
              disabled={fieldsDisabled}
              required
            />
          </div>
        </div>

        {feedback && (
          <div className="employee-form__feedback">
            <FeedbackMessage variant={feedback.variant}>
              {feedback.message}
            </FeedbackMessage>
          </div>
        )}

        <TemporaryCredentials credentials={credentials} />

        <div className="employee-form__actions">
          {savedEmployee ? (
            <>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => navigate(ROUTES.MANAGER_HOME)}
              >
                Back to home
              </button>

              <button
                className="button button--primary"
                type="button"
                onClick={handleCreateAnother}
              >
                Create another employee
              </button>
            </>
          ) : (
            <>
              <button
                className="button button--secondary"
                type="button"
                disabled={saving}
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                className="button button--primary"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving employee…' : 'Save employee'}
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  )
}

export default NewEmployeePage