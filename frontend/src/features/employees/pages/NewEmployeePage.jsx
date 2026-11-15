import './NewEmployeePage.css'

function NewEmployeePage() {
  return (
    <section className="employee-page" aria-labelledby="employee-page-title">
      <header className="page-header">
        <p className="page-eyebrow">Team management</p>
        <h1 id="employee-page-title">Create employee</h1>
        <p>Add the employee’s contact and position details.</p>
      </header>

      <form className="employee-form">
        <div className="employee-form__grid">
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" required />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required />
          </div>

          <div className="form-field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" name="phone" type="tel" required />
          </div>

          <div className="form-field">
            <label htmlFor="position">Position</label>
            <input id="position" name="position" type="text" required />
          </div>
        </div>

        <div className="employee-form__actions">
          <button className="button button--secondary" type="button">
            Cancel
          </button>
          <button className="button button--primary" type="button">
            Save employee
          </button>
        </div>
      </form>
    </section>
  )
}

export default NewEmployeePage