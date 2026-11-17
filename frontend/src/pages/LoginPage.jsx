import './LoginPage.css'

function LoginPage() {
  function handleSubmit(event) {
    event.preventDefault()
  }

  return (
    <section className="login-page" aria-labelledby="login-title">
      <div className="login-card">
        <p className="login-brand">ShiftEase</p>
        <h1 id="login-title">Welcome back</h1>
        <p>Sign in with the email address assigned to your account.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button className="button button--primary" type="submit">
            Sign in
          </button>
        </form>

        <p className="login-help">
          Need an account? Contact your administrator.
        </p>
      </div>
    </section>
  )
}

export default LoginPage
