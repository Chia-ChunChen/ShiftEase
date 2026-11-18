# ShiftEase
### Employee Scheduling Management System

## 1. Project Description

ShiftEase is a web-based Employee Scheduling Management System designed to help small businesses manage employee information, work schedules, and employee availability.

## 2. Project Objectives

- Simplify employee scheduling.
- Improve schedule management.
- Reduce scheduling conflicts.
- Allow employees to communicate their availability.

## 3. Key Features

- Employee Management
- Schedule Management
- Employee Availability Management
- User Account Management
- Role Management

## 4. Updates for PR #3

- **Employee accounts.** When a manager saves a new employee record, ShiftEase creates an Employee login account or links an existing Employee account with the same email through `Employee.user`. Linking preserves the existing password. New accounts receive a temporary password.
- **Administrator and employee APIs.** Administrators can list, create, update, and delete user accounts. Staff can view and update employee records, and employees can view their own profile. Changing a linked account's email updates the employee record. Deleting the login account removes the link and preserves the employee record.
- **Sign-in and permissions.** The web app uses a session cookie. API clients can use a JWT when `JWT_SECRET` is configured. Access depends on the signed-in user's role. Users with a temporary password must choose a new password before using protected features.
- **Availability and scheduling.** The frontend saves weekly availability and draft shifts through the API. The backend rejects overlapping availability and checks assigned employees for availability and overlapping shifts when a shift changes.

## 5. Postman API Testing

The Postman collection ran through Newman against a separate local MongoDB replica set. **All 39 requests and 66 assertions passed.** The run used test accounts and did not modify the team's database.

| Area | What passed |
| --- | --- |
| Login and access | Cookie and JWT login, rejection of incorrect passwords and unauthorized roles, and invalidation of old sessions after a password change or logout |
| Accounts and employee records | Administrator account management, duplicate email rejection, manager account creation, and `Employee.user` linking that preserves the existing password |
| Availability and scheduling | Employee availability submission, overlap rejection, draft shift creation, employee assignment, and rejection of a shift edit outside the assigned employee's availability |

To repeat the full collection, start ShiftEase against a disposable MongoDB replica set, configure `JWT_SECRET` on that test backend, and select a Postman environment with the test API address and test accounts. The collection checks API responses and database behavior. Browser interactions were outside the scope of this run.
