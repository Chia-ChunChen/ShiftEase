import { Link } from 'react-router'
import { ROUTES } from '../../../app/routes.js'
import './EmployeeProfilePage.css'

function EmployeeProfilePage({ employee = null }) {
  const displayValue = (value) =>
    typeof value === 'string' && value.trim() ? value : 'Not available'

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <header className="profile-page__header">
        <p className="profile-page__eyebrow">Employee workspace</p>
        <h1 id="profile-title">My profile</h1>
        <p>View your personal information and work details.</p>
      </header>

      {!employee && (
        <p className="profile-page__notice" role="status">
          Your profile information is currently unavailable.
        </p>
      )}

      <div className="profile-page__grid">
        <section className="profile-card" aria-labelledby="personal-title">
          <h2 id="personal-title">Personal information</h2>
          <dl className="profile-details">
            <div>
              <dt>Full name</dt>
              <dd>{displayValue(employee?.name)}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>{displayValue(employee?.email)}</dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd>{displayValue(employee?.phone)}</dd>
            </div>
          </dl>
        </section>

        <section className="profile-card" aria-labelledby="work-title">
          <h2 id="work-title">Work information</h2>
          <dl className="profile-details">
            <div>
              <dt>Position</dt>
              <dd>{displayValue(employee?.position)}</dd>
            </div>
          </dl>
          <p className="profile-card__help">
            Contact your manager if your details need to be updated.
          </p>
        </section>
      </div>

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