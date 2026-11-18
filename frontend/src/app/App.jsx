import { Navigate, Route, Routes } from 'react-router'
import { ROUTES } from './routes.js'
import AuthLayout from '../layouts/AuthLayout.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { ROLES } from './roles.js'
import AdminHomePage from '../features/home/pages/AdminHomePage.jsx'
import ManagerHomePage from '../features/home/pages/ManagerHomePage.jsx'
import EmployeeHomePage from '../features/home/pages/EmployeeHomePage.jsx'
import EmployeeProfilePage from '../features/employees/pages/EmployeeProfilePage.jsx'
import AccountsPage from '../features/accounts/pages/AccountsPage.jsx'
import CreateAccountPage from '../features/accounts/pages/CreateAccountPage.jsx'
import NewEmployeePage from '../features/employees/pages/NewEmployeePage.jsx'
import NewSchedulePage from '../features/schedules/pages/NewSchedulePage.jsx'
import AvailabilityPage from '../features/availability/pages/AvailabilityPage.jsx'
import EmployeeRequestsPage from '../features/availability/pages/EmployeeRequestsPage.jsx'
import AdminRequestsPage from '../features/accounts/pages/AdminRequestsPage.jsx'
import AvailabilityRequestsPage from '../features/availability/pages/AvailabilityRequestsPage.jsx'

function App() {
  return (
    <Routes>
      <Route
        path={ROUTES.MANAGER_AVAILABILITY_REQUESTS}
        element={
          <DashboardLayout role={ROLES.MANAGER}>
            <AvailabilityRequestsPage />
          </DashboardLayout>
        }
      />
      <Route
        path={ROUTES.EMPLOYEE_REQUESTS}
        element={
          <DashboardLayout role={ROLES.EMPLOYEE}>
            <EmployeeRequestsPage />
          </DashboardLayout>
        }
      />
      <Route
        path={ROUTES.ADMIN_REQUESTS}
        element={
          <DashboardLayout role={ROLES.ADMINISTRATOR}>
            <AdminRequestsPage />
          </DashboardLayout>
        }
      />
      <Route
        path={ROUTES.EMPLOYEE_PROFILE}
        element={
          <DashboardLayout role={ROLES.EMPLOYEE}>
            <EmployeeProfilePage />
          </DashboardLayout>
          }
      />
      <Route
        path="/"
        element={<Navigate to={ROUTES.LOGIN} replace />}
      />
      <Route
        path={ROUTES.LOGIN}
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />
      <Route path={ROUTES.ADMIN_HOME} element={<AdminHomePage />} />
      <Route path={ROUTES.MANAGER_HOME} element={<ManagerHomePage />} />
      <Route path={ROUTES.EMPLOYEE_HOME} element={<EmployeeHomePage />} />

      <Route
        path={ROUTES.ADMIN_ACCOUNTS}
        element={
          <DashboardLayout role={ROLES.ADMINISTRATOR}>
            <AccountsPage />
          </DashboardLayout>
        }
      />
      <Route
        path={ROUTES.ADMIN_CREATE_ACCOUNT}
        element={
          <DashboardLayout role={ROLES.ADMINISTRATOR}>
            <CreateAccountPage />
          </DashboardLayout>
        }
      />
      <Route
        path={ROUTES.NEW_EMPLOYEE}
        element={
          <DashboardLayout role={ROLES.MANAGER}>
            <NewEmployeePage />
          </DashboardLayout>
        }
      />
      <Route
        path={ROUTES.NEW_SCHEDULE}
        element={
          <DashboardLayout role={ROLES.MANAGER}>
            <NewSchedulePage />
          </DashboardLayout>
        }
      />
      <Route
        path={ROUTES.EMPLOYEE_AVAILABILITY}
        element={
          <DashboardLayout role={ROLES.EMPLOYEE}>
            <AvailabilityPage />
          </DashboardLayout>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App