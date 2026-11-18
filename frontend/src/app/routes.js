import { ROLES } from './roles.js';

// Application routes and role access map.
export const ROUTES = Object.freeze({
  LOGIN: '/login',
  ADMIN_HOME: '/admin',
  MANAGER_HOME: '/manager',
  NEW_EMPLOYEE: '/manager/employees/new',
  NEW_SCHEDULE: '/manager/schedules/new',
  MANAGER_AVAILABILITY_REQUESTS: '/manager/availability-requests',
  EMPLOYEE_HOME: '/employee',
  EMPLOYEE_PROFILE: '/employee/profile',
  EMPLOYEE_AVAILABILITY: '/employee/availability',
  ADMIN_ACCOUNTS: '/admin/accounts',
  ADMIN_CREATE_ACCOUNT: '/admin/accounts/new',
  EMPLOYEE_REQUESTS: '/employee/requests',
  ADMIN_REQUESTS: '/admin/requests',
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
  [ROUTES.MANAGER_AVAILABILITY_REQUESTS]: [ROLES.MANAGER],
  [ROUTES.EMPLOYEE_HOME]: [ROLES.EMPLOYEE],
  [ROUTES.EMPLOYEE_PROFILE]: [ROLES.EMPLOYEE],
  [ROUTES.EMPLOYEE_AVAILABILITY]: [ROLES.EMPLOYEE],
  [ROUTES.EMPLOYEE_REQUESTS]: [ROLES.EMPLOYEE],
  [ROUTES.ADMIN_REQUESTS]: [ROLES.ADMINISTRATOR],
});

const ROLE_HOME_ROUTES = Object.freeze({
  [ROLES.ADMINISTRATOR]: ROUTES.ADMIN_HOME,
  [ROLES.MANAGER]: ROUTES.MANAGER_HOME,
  [ROLES.EMPLOYEE]: ROUTES.EMPLOYEE_HOME,
})

export function getHomeRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] ?? ROUTES.LOGIN
}
