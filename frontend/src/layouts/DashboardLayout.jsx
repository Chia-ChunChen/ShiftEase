function DashboardLayout({ children, role }) {
  return (
    <div className="dashboard-layout" data-role={role}>
      <header className="dashboard-layout__header">ShiftEase</header>
      <main className="dashboard-layout__content">{children}</main>
    </div>
  );
}

export default DashboardLayout;
