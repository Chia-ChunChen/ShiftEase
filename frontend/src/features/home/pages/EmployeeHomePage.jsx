import DashboardLayout from '../../../layouts/DashboardLayout.jsx';
import { ROLES } from '../../../app/roles.js';

function EmployeeHomePage() {
  return (
    <DashboardLayout role={ROLES.EMPLOYEE}>
      <h1>Employee Home</h1>
    </DashboardLayout>
  );
}

export default EmployeeHomePage;
