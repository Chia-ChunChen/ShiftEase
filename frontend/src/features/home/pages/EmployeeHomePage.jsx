import { Link } from 'react-router'
import DashboardLayout from '../../../layouts/DashboardLayout.jsx'
import { ROLES } from '../../../app/roles.js'
import { ROUTES } from '../../../app/routes.js'
import './EmployeeHomePage.css'

function EmployeeHomePage() {
  return (
    <DashboardLayout role={ROLES.EMPLOYEE}>
      <section
        className="employee-home"
        aria-labelledby="employee-home-title"
      >
        <header className="employee-home__header">
          <p className="employee-home__eyebrow">Employee workspace</p>
          <h1 id="employee-home-title">Employee home</h1>
          <p>View your profile and manage your weekly availability.</p>
        </header>

        <div className="employee-home__grid">
          <section
            className="employee-home__card"
            aria-labelledby="employee-profile-title"
          >
            <h2 id="employee-profile-title">My profile</h2>
            <p>
              View your personal information, contact details and position.
            </p>
            <Link
              className="employee-home__action"
              to={ROUTES.EMPLOYEE_PROFILE}
            >
              View my profile
            </Link>
          </section>

          <section
            className="employee-home__card"
            aria-labelledby="employee-availability-title"
          >
            <h2 id="employee-availability-title">My availability</h2>
            <p>
              Choose the dates and hours when you are available to work.
            </p>
            <Link
              className="employee-home__action"
              to={ROUTES.EMPLOYEE_AVAILABILITY}
            >
              Manage availability
            </Link>
          </section>
        </div>
      </section>
    </DashboardLayout>
  )
}

export default EmployeeHomePage
