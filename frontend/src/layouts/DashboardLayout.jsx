import { NavLink } from 'react-router'
import { ROLES } from '../app/roles.js'
import { ROUTES } from '../app/routes.js'
import './DashboardLayout.css'

const navigationByRole = {
  [ROLES.ADMINISTRATOR]: [
    { label: 'Home', to: ROUTES.ADMIN_HOME },
    { label: 'User accounts', to: ROUTES.ADMIN_ACCOUNTS },
  ],
  [ROLES.MANAGER]: [
    { label: 'Home', to: ROUTES.MANAGER_HOME },
    { label: 'Create employee', to: ROUTES.NEW_EMPLOYEE },
    { label: 'Create schedule', to: ROUTES.NEW_SCHEDULE },
  ],
  [ROLES.EMPLOYEE]: [
    { label: 'Home', to: ROUTES.EMPLOYEE_HOME },
    { label: 'My profile', to: ROUTES.EMPLOYEE_PROFILE },
    { label: 'Availability', to: ROUTES.EMPLOYEE_AVAILABILITY },
  ],
}

function DashboardLayout({ children, role }) {
  const navigationItems = navigationByRole[role] ?? []

  return (
    <div className="dashboard-layout" data-role={role}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">ShiftEase</div>
        <p className="dashboard-role">{role}</p>

        <nav className="dashboard-nav" aria-label={`${role} navigation`}>
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `dashboard-nav__link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <span>{role} workspace</span>
        </header>
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  )
}

export default DashboardLayout