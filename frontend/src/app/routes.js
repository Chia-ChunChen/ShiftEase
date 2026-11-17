import { ROLES } from './roles.js';

export const ROUTES = Object.freeze({
  LOGIN: '/login',
  PROFILE: '/profile',
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
  [ROUTES.PROFILE]: Object.values(ROLES),
  [ROUTES.ADMIN_HOME]: [ROLES.ADMINISTRATOR],
  [ROUTES.ADMIN_ACCOUNTS]: [ROLES.ADMINISTRATOR],
  [ROUTES.ADMIN_CREATE_ACCOUNT]: [ROLES.ADMINISTRATOR],
  [ROUTES.MANAGER_HOME]: [ROLES.MANAGER],
  [ROUTES.NEW_EMPLOYEE]: [ROLES.MANAGER],
  [ROUTES.NEW_SCHEDULE]: [ROLES.MANAGER],
  [ROUTES.EMPLOYEE_HOME]: [ROLES.EMPLOYEE],
  [ROUTES.EMPLOYEE_AVAILABILITY]: [ROLES.EMPLOYEE],
});

const ROLE_HOME_ROUTES = Object.freeze({
  [ROLES.ADMINISTRATOR]: ROUTES.ADMIN_HOME,
  [ROLES.MANAGER]: ROUTES.MANAGER_HOME,
  [ROLES.EMPLOYEE]: ROUTES.EMPLOYEE_HOME,
})

export function getHomeRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] ?? ROUTES.LOGIN
}
