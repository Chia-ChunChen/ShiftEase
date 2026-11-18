import { getJson, postJson, putJson } from '../../../shared/services/apiClient.js'

// Proposed contract: backend must implement these endpoints and enforce JWT roles.
function data(response) {
  if (!response || !Object.prototype.hasOwnProperty.call(response, 'data')) throw new Error('Unexpected server response.')
  return response.data
}

export async function getCurrentAvailability(options) {
  return data(await getJson('/api/availability/current', options))
}

export async function getMyAvailabilityRequests(options) {
  const result = data(await getJson('/api/availability/requests/mine', options))
  if (!Array.isArray(result)) throw new Error('Unexpected request list.')
  return result
}

export async function submitAvailabilityRequest(payload) {
  const result = data(await postJson('/api/availability/requests', payload))
  if (!result?._id || result.status !== 'pending') throw new Error('Submission was not confirmed. Check your requests before submitting again.')
  return result
}

export async function getPendingAvailabilityRequests(options) {
  const result = data(await getJson('/api/availability/requests?status=pending', options))
  if (!Array.isArray(result)) throw new Error('Unexpected request list.')
  return result
}

export async function approveAvailabilityRequest(id) {
  const result = data(await putJson(`/api/availability/requests/${encodeURIComponent(id)}/approve`, {}))
  if (result?.status !== 'approved') throw new Error('Approval was not confirmed. Refresh the request list.')
  return result
}
