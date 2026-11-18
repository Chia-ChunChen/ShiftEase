import { Link } from 'react-router'
import DashboardLayout from '../../../layouts/DashboardLayout.jsx'
import { ROLES } from '../../../app/roles.js'
import { ROUTES } from '../../../app/routes.js'
import './ManagerHomePage.css'

function ManagerHomePage() {
  return (
    <DashboardLayout role={ROLES.MANAGER}>
      <section
        className="manager-home"
        aria-labelledby="manager-home-title"
      >
        <header className="manager-home__header">
          <p className="manager-home__eyebrow">Team management</p>
          <h1 id="manager-home-title">Manager home</h1>
          <p>Manage employee information and organize your team's shifts.</p>
        </header>

        <div className="manager-home__grid">
          <section
            className="manager-home__card"
            aria-labelledby="manage-employees-title"
          >
            <h2 id="manage-employees-title">Employees</h2>
            <p>
              Add a new employee's contact information and position
              to your team.
            </p>
            <Link
              className="manager-home__action"
              to={ROUTES.NEW_EMPLOYEE}
            >
              Create employee
            </Link>
          </section>

          <section
            className="manager-home__card"
            aria-labelledby="manage-schedules-title"
          >
            <h2 id="manage-schedules-title">Weekly schedules</h2>
            <p>
              Choose shift dates and working hours, assign employees,
              and save the weekly schedule.
            </p>
            <Link
              className="manager-home__action"
              to={ROUTES.NEW_SCHEDULE}
            >
              Create schedule
            </Link>
          </section>
        </div>
      </section>
    </DashboardLayout>
  )
}

export default ManagerHomePage