import { postJson } from '../../../shared/services/apiClient.js';

export function createAccount(account) {
  return postJson('/api/users', account);
}
