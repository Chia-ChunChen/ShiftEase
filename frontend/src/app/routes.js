import { ROLES } from './roles.js';

// Route and role map for the next navigation step. These paths are not wired yet.
export const ROUTES = Object.freeze({
  LOGIN: '/login',
  ADMIN_HOME: '/admin',
  MANAGER_HOME: '/manager',
  NEW_EMPLOYEE: '/manager/employees/new',
  NEW_SCHEDULE: '/manager/schedules/new',
  EMPLOYEE_HOME: '/employee',
  EMPLOYEE_AVAILABILITY: '/employee/availability',
  ADMIN_ACCOUNTS: '/admin/accounts',
  ADMIN_CREATE_ACCOUNT: '/admin/accounts/new',
});

export const PUBLIC_ROUTES = Object.freeze([
  ROUTES.LOGIN,
]);

export const ROUTE_ACCESS = Object.freeze({
  [ROUTES.ADMIN_HOME]: [ROLES.ADMINISTRATOR],
  [ROUTES.ADMIN_ACCOUNTS]: [ROLES.ADMINISTRATOR],
  [ROUTES.ADMIN_CREATE_ACCOUNT]: [ROLES.ADMINISTRATOR],
  [ROUTES.MANAGER_HOME]: [ROLES.MANAGER],
  [ROUTES.NEW_EMPLOYEE]: [ROLES.MANAGER],
  [ROUTES.NEW_SCHEDULE]: [ROLES.MANAGER],
  [ROUTES.EMPLOYEE_HOME]: [ROLES.EMPLOYEE],
  [ROUTES.EMPLOYEE_AVAILABILITY]: [ROLES.EMPLOYEE],
});
