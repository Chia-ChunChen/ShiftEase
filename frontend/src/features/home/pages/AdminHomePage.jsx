import DashboardLayout from '../../../layouts/DashboardLayout.jsx';
import { ROLES } from '../../../app/roles.js';

function AdminHomePage() {
  return (
    <DashboardLayout role={ROLES.ADMINISTRATOR}>
      <h1>Administrator Home</h1>
    </DashboardLayout>
  );
}

export default AdminHomePage;
