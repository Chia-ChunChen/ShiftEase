import SignupPage from '../features/accounts/pages/SignupPage.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';

function App() {
  // The existing screen remains the entry point while the route map is designed.
  return <AuthLayout><SignupPage /></AuthLayout>;
}

export default App;
