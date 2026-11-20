import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import { getJson, deleteJson } from '../../../shared/services/apiClient.js'
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx'
import EditAccountForm from './EditAccountForm.jsx'
import './AccountsPage.css'

function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionFeedback, setActionFeedback] = useState(null)

  const deleteInProgress = useRef(false)
  const listHeadingRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadAccounts() {
      try {
        const result = await getJson('/api/admin/users', {
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        if (
          !Array.isArray(result?.users) ||
          result.users.some(account => !account?._id)
        ) {
          throw new Error('The server returned an invalid account list.')
        }

        setAccounts(result.users)
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure.message || 'Unable to load accounts.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAccounts()

    return () => controller.abort()
  }, [reload])

  function refreshAccounts() {
    setLoading(true)
    setError('')
    setActionFeedback(null)
    setReload(value => value + 1)
  }

  function openEditor(account) {
    if (deleteInProgress.current) return

    setActionFeedback(null)
    setEditingId(account._id)

    requestAnimationFrame(() => {
      document.getElementById('edit-account-title')?.focus()
    })
  }

  function closeEditor() {
    setEditingId(null)

    requestAnimationFrame(() => {
      listHeadingRef.current?.focus()
    })
  }

  function accountSaved(updatedAccount) {
    setAccounts(current =>
      current.map(account =>
        account._id === updatedAccount._id ? updatedAccount : account,
      ),
    )

    setActionFeedback({
      variant: 'success',
      message: `${updatedAccount.name}'s account was updated.`,
    })

    closeEditor()
  }

  async function confirmDelete(account) {
    if (deleteInProgress.current) return

    const name = account.name || account.email

    const confirmed = window.confirm(
      `You are about to delete ${name}'s account.\n\n` +
      'They will lose access to ShiftEase. Any linked employee record will remain.\n\n' +
      'Would you like to continue?',
    )

    if (!confirmed) return

    deleteInProgress.current = true
    setDeletingId(account._id)
    setActionFeedback(null)

    try {
      await deleteJson(
        `/api/admin/users/${encodeURIComponent(account._id)}`,
      )

      setAccounts(current =>
        current.filter(item => item._id !== account._id),
      )

      setActionFeedback({
        variant: 'success',
        message: `${name}'s account was deleted.`,
      })

      requestAnimationFrame(() => {
        listHeadingRef.current?.focus()
      })
    } catch (failure) {
      setActionFeedback({
        variant: 'error',
        message: failure.message || 'Unable to delete the account.',
      })
    } finally {
      deleteInProgress.current = false
      setDeletingId(null)
    }
  }

  if (editingId) {
    return (
      <EditAccountForm
        key={editingId}
        accountId={editingId}
        onCancel={closeEditor}
        onSaved={accountSaved}
      />
    )
  }

  return (
    <section className="accounts-page" aria-labelledby="accounts-page-title">
      <header className="accounts-page__header">
        <div className="accounts-page__intro">
          <p className="accounts-page__eyebrow">User management</p>
          <h1 id="accounts-page-title">User accounts</h1>
          <p>Create, edit and manage user accounts.</p>
        </div>

        <Link
          className="accounts-page__create"
          to={ROUTES.ADMIN_CREATE_ACCOUNT}
          aria-disabled={Boolean(deletingId)}
          onClick={event => {
            if (deleteInProgress.current) event.preventDefault()
          }}
        >
          Create account
        </Link>
      </header>

      <section
        className="accounts-panel"
        aria-labelledby="accounts-list-title"
        aria-busy={loading || Boolean(deletingId)}
      >
        <div className="accounts-panel__heading">
          <h2
            id="accounts-list-title"
            ref={listHeadingRef}
            tabIndex={-1}
          >
            Existing accounts
          </h2>

          <button
            className="accounts-panel__refresh"
            type="button"
            onClick={refreshAccounts}
            disabled={loading || Boolean(deletingId)}
          >
            {loading ? 'Loading…' : error ? 'Try again' : 'Refresh accounts'}
          </button>
        </div>

        {actionFeedback && (
          <FeedbackMessage variant={actionFeedback.variant}>
            {actionFeedback.message}
          </FeedbackMessage>
        )}

        {loading ? (
          <p className="accounts-panel__status" role="status">
            Loading accounts…
          </p>
        ) : error ? (
          <FeedbackMessage variant="error">
            {error}
          </FeedbackMessage>
        ) : (
          <div
            className="accounts-panel__table-wrapper"
            role="region"
            aria-labelledby="accounts-list-title"
            tabIndex={0}
          >
            <table className="accounts-table">
              <caption className="accounts-table__caption">
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                {' '}— names, corporate emails and roles
              </caption>

              <thead>
                <tr>
                  <th scope="col">Full name</th>
                  <th scope="col">Corporate email</th>
                  <th scope="col">Role</th>
                  <th
                    scope="col"
                    className="accounts-table__actions-heading"
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td className="accounts-table__message" colSpan={4}>
                      No accounts found.
                    </td>
                  </tr>
                ) : (
                  accounts.map(account => (
                    <tr key={account._id}>
                      <td>{account.name || 'Not available'}</td>
                      <td>{account.email || 'Not available'}</td>

                      <td>
                        <span className="accounts-table__role">
                          {account.role || 'Not available'}
                        </span>
                      </td>

                      <td>
                        <div className="accounts-row-actions">
                          <button
                            className="accounts-icon-button"
                            type="button"
                            aria-label={`Edit account for ${account.name || account.email}`}
                            title="Edit account"
                            disabled={Boolean(deletingId)}
                            onClick={() => openEditor(account)}
                          >
                            <svg
                              width="19"
                              height="19"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" />
                              <path d="m14 5 5 5" />
                            </svg>
                          </button>

                          <button
                            className="accounts-icon-button accounts-icon-button--delete"
                            type="button"
                            aria-label={`Delete account for ${account.name || account.email}`}
                            title="Delete account"
                            disabled={Boolean(deletingId)}
                            onClick={() => confirmDelete(account)}
                          >
                            <svg
                              width="19"
                              height="19"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15" />
                              <path d="M10 10v7M14 10v7" />
                            </svg>
                          </button>
                          {deletingId === account._id && (
                            <span role="status">Deleting…</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

export default AccountsPage