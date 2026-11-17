import DashboardLayout from '../../../layouts/DashboardLayout.jsx';
import { ROLES } from '../../../app/roles.js';

function ManagerHomePage() {
  return (
    <DashboardLayout role={ROLES.MANAGER}>
      <h1>Manager Home</h1>
    </DashboardLayout>
  );
}

export default ManagerHomePage;
