import { useState } from 'react'
import FeedbackMessage from '../shared/components/FeedbackMessage.jsx'
import { requestJson } from '../shared/services/apiClient.js'
import { NavLink } from 'react-router'
import { ROLES } from '../app/roles.js'
import { ROUTES } from '../app/routes.js'
import './DashboardLayout.css'

const navigationByRole = {
  [ROLES.ADMINISTRATOR]: [
    { label: 'Home', to: ROUTES.ADMIN_HOME },
    { label: 'User accounts', to: ROUTES.ADMIN_ACCOUNTS },
    { label: 'Requests', to: ROUTES.ADMIN_REQUESTS },
  ],
  [ROLES.MANAGER]: [
    { label: 'Home', to: ROUTES.MANAGER_HOME },
    { label: 'Create employee', to: ROUTES.NEW_EMPLOYEE },
    { label: 'Create schedule', to: ROUTES.NEW_SCHEDULE },
    { label: 'Requests', to: ROUTES.MANAGER_AVAILABILITY_REQUESTS },
  ],
  [ROLES.EMPLOYEE]: [
    { label: 'Home', to: ROUTES.EMPLOYEE_HOME },
    { label: 'My profile', to: ROUTES.EMPLOYEE_PROFILE },
    { label: 'Availability', to: ROUTES.EMPLOYEE_AVAILABILITY },
    { label: 'Requests', to: ROUTES.EMPLOYEE_REQUESTS },
  ],
}

function DashboardLayout({ children, role, mustChangePassword, onSignOut }) {
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const profile = { label: 'My profile', to: ROUTES.PROFILE }
  const navigationItems = mustChangePassword ? [profile] : [...(navigationByRole[role] ?? []), profile]

  async function signOut() {
    setSigningOut(true)
    setError('')
    try {
      await requestJson('/api/users/logout', { method: 'POST' })
      onSignOut()
    } catch (error) {
      setError(error.message)
    } finally {
      setSigningOut(false)
    }
  }

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
          <button className="button button--secondary" type="button" onClick={signOut} disabled={signingOut}>Sign out</button>
        </header>
        <main className="dashboard-main">
          <FeedbackMessage variant="error">{error}</FeedbackMessage>
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout