import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { getHomeRouteForRole, ROUTES, ROUTE_ACCESS } from './routes.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import AdminHomePage from '../features/home/pages/AdminHomePage.jsx'
import ManagerHomePage from '../features/home/pages/ManagerHomePage.jsx'
import EmployeeHomePage from '../features/home/pages/EmployeeHomePage.jsx'
import AccountsPage from '../features/accounts/pages/AccountsPage.jsx'
import CreateAccountPage from '../features/accounts/pages/CreateAccountPage.jsx'
import ProfilePage from '../features/accounts/pages/ProfilePage.jsx'
import NewEmployeePage from '../features/employees/pages/NewEmployeePage.jsx'
import NewSchedulePage from '../features/schedules/pages/NewSchedulePage.jsx'
import AvailabilityPage from '../features/availability/pages/AvailabilityPage.jsx'
import FeedbackMessage from '../shared/components/FeedbackMessage.jsx'
import { requestJson } from '../shared/services/apiClient.js'

function App() {
  const [user, setUser] = useState(undefined)
  const [sessionError, setSessionError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const abort = new AbortController()
    requestJson('/api/users/me', { signal: abort.signal })
      .then(result => setUser(result.user))
      .catch(error => {
        if (error.name === 'AbortError') return
        setSessionError(error.status === 401 ? '' : error.message)
        setUser(null)
      })
    const clearSession = () => setUser(null)
    window.addEventListener('shiftease:session-ended', clearSession)
    return () => {
      abort.abort()
      window.removeEventListener('shiftease:session-ended', clearSession)
    }
  }, [attempt])

  if (user === undefined) return <main aria-busy="true">Checking your session…</main>
  if (sessionError) {
    return (
      <main>
        <FeedbackMessage variant="error">{sessionError}</FeedbackMessage>
        <button type="button" onClick={() => {
          setUser(undefined)
          setSessionError('')
          setAttempt(value => value + 1)
        }}>Try again</button>
      </main>
    )
  }

  const landing = user?.mustChangePassword
    ? ROUTES.PROFILE
    : getHomeRouteForRole(user?.role)

  function protectedPage(path, page) {
    if (!user) return <Navigate to={ROUTES.LOGIN} replace />
    if (user.mustChangePassword && path !== ROUTES.PROFILE) {
      return <Navigate to={ROUTES.PROFILE} replace />
    }
    if (!ROUTE_ACCESS[path].includes(user.role)) return <Navigate to={landing} replace />
    return (
      <DashboardLayout role={user.role} mustChangePassword={user.mustChangePassword} onSignOut={() => setUser(null)}>
        {page}
      </DashboardLayout>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={landing} replace />} />
      <Route path={ROUTES.LOGIN} element={user
        ? <Navigate to={landing} replace />
        : <AuthLayout><LoginPage onSignIn={setUser} /></AuthLayout>
      } />
      <Route path={ROUTES.ADMIN_HOME} element={protectedPage(ROUTES.ADMIN_HOME, <AdminHomePage />)} />
      <Route path={ROUTES.ADMIN_ACCOUNTS} element={protectedPage(ROUTES.ADMIN_ACCOUNTS, <AccountsPage />)} />
      <Route path={ROUTES.ADMIN_CREATE_ACCOUNT} element={protectedPage(ROUTES.ADMIN_CREATE_ACCOUNT, <CreateAccountPage />)} />
      <Route path={ROUTES.MANAGER_HOME} element={protectedPage(ROUTES.MANAGER_HOME, <ManagerHomePage />)} />
      <Route path={ROUTES.NEW_EMPLOYEE} element={protectedPage(ROUTES.NEW_EMPLOYEE, <NewEmployeePage />)} />
      <Route path={ROUTES.NEW_SCHEDULE} element={protectedPage(ROUTES.NEW_SCHEDULE, <NewSchedulePage />)} />
      <Route path={ROUTES.EMPLOYEE_HOME} element={protectedPage(ROUTES.EMPLOYEE_HOME, <EmployeeHomePage />)} />
      <Route path={ROUTES.EMPLOYEE_AVAILABILITY} element={protectedPage(ROUTES.EMPLOYEE_AVAILABILITY, <AvailabilityPage />)} />
      <Route path={ROUTES.PROFILE} element={protectedPage(ROUTES.PROFILE, <ProfilePage user={user} onPasswordChanged={() => setUser(null)} />)} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
