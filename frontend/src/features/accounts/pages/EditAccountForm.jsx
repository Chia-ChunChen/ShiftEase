import { useEffect, useState } from 'react'
import { getJson, putJson } from '../../../shared/services/apiClient.js'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import './CreateAccountPage.css'

function EditAccountForm({ accountId, onCancel, onSaved }) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getJson(`/api/admin/users/${encodeURIComponent(accountId)}`, {
      signal: controller.signal,
    })
      .then(result => {
        if (controller.signal.aborted) return

        if (result?.user?._id !== accountId) {
          throw new Error('The server did not return the selected account.')
        }

        setAccount({
          name: result.user.name || '',
          email: result.user.email || '',
          role: result.user.role || '',
        })
      })
      .catch(failure => {
        if (!controller.signal.aborted) {
          setError(failure.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [accountId, attempt])

  function updateField(field, value) {
    setAccount(current => ({ ...current, [field]: value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    const payload = {
      name: account.name.trim(),
      email: account.email.trim(),
      role: account.role,
    }

    if (!payload.name) {
      setError('Enter a full name. Spaces alone are not accepted.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const result = await putJson(
        `/api/admin/users/${encodeURIComponent(accountId)}`,
        payload,
      )

      if (result?.user?._id !== accountId) {
        throw new Error(
          'The server did not confirm the update. Reload the account before trying again.',
        )
      }

      onSaved(result.user)
    } catch (failure) {
      setError(failure.message || 'Unable to update the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="account-page" aria-labelledby="edit-account-title">
      <header className="page-header">
        <p className="page-eyebrow">User management</p>
        <h1 id="edit-account-title" tabIndex={-1}>
          Edit account
        </h1>
        <p>Update the account details and save your changes.</p>
      </header>

      {loading ? (
        <p role="status">Loading account…</p>
      ) : !account ? (
        <div>
          <FeedbackMessage variant="error">{error}</FeedbackMessage>
          <button
            type="button"
            className="accounts-panel__refresh"
            onClick={() => {
              setLoading(true)
              setError('')
              setAttempt(value => value + 1)
            }}
          >
            Try again
          </button>
          <button
            type="button"
            className="accounts-panel__refresh"
            onClick={onCancel}
          >
            Back to accounts
          </button>
        </div>
      ) : (
        <form
          className="account-form"
          onSubmit={handleSubmit}
          aria-busy={busy}
        >
          <div className="form-field">
            <label htmlFor="edit-account-name">Full name</label>
            <input
              id="edit-account-name"
              name="name"
              value={account.name}
              onChange={event => updateField('name', event.target.value)}
              disabled={busy}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-email">Corporate email</label>
            <input
              id="edit-account-email"
              name="email"
              type="email"
              value={account.email}
              onChange={event => updateField('email', event.target.value)}
              disabled={busy}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-account-role">Role</label>
            <select
              id="edit-account-role"
              name="role"
              value={account.role}
              onChange={event => updateField('role', event.target.value)}
              disabled={busy}
              required
              aria-describedby="edit-account-role-help"
            >
              <option value="" disabled>Select a role</option>
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>
            <p id="edit-account-role-help" className="account-form__help">
              Accounts linked to an employee record must keep the Employee role.
            </p>
          </div>

          {error && (
            <div className="account-form__feedback">
              <FeedbackMessage variant="error">{error}</FeedbackMessage>
            </div>
          )}

          <div className="account-form__actions">
            <button
              className="button button--secondary"
              type="button"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save account'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default EditAccountForm