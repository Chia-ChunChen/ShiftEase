import { useState } from 'react';
import FeedbackMessage from '../../../shared/components/FeedbackMessage.jsx';
import { createAccount } from '../services/accountService.js';
import './SignupPage.css';

function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await createAccount({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      setMessage('Account created successfully!');
      setForm({ name: '', email: '', password: '', confirmPassword: '' });
    } catch (requestError) {
      setError(requestError.message || 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="account-card">
        <div className="brand">ShiftEase</div>
        <h1>Create your account</h1>
        <p className="subtitle">
          Enter your information to create an employee account.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters, including a letter and number"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            required
          />

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <p className="role-note">
            Account type: <strong>Employee</strong>
          </p>
          <FeedbackMessage variant="error">{error}</FeedbackMessage>
          <FeedbackMessage variant="success">{message}</FeedbackMessage>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default SignupPage;
