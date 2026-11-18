import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import './AccountsPage.css'

function AccountsPage() {
  return (
    <section className="accounts-page" aria-labelledby="accounts-page-title">
      <header className="accounts-page__header">
        <div className="accounts-page__intro">
          <p className="accounts-page__eyebrow">User management</p>
          <h1 id="accounts-page-title">User accounts</h1>
          <p>View user accounts and create accounts for new users.</p>
        </div>

        <Link
          className="accounts-page__create"
          to={ROUTES.ADMIN_CREATE_ACCOUNT}
        >
          Create account
        </Link>
      </header>

      <section
        className="accounts-panel"
        aria-labelledby="accounts-list-title"
      >
        <h2 id="accounts-list-title">Existing accounts</h2>

        <div
          className="accounts-panel__table-wrapper"
          role="region"
          aria-labelledby="accounts-list-title"
          tabIndex={0}
        >
          <table className="accounts-table">
            <caption className="accounts-table__caption">
              User account names, email addresses and roles
            </caption>
            <thead>
              <tr>
                <th scope="col">Full name</th>
                <th scope="col">Email address</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="accounts-table__message" colSpan={3}>
                  The account list is not available yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

export default AccountsPage
