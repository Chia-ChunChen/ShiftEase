const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function requestJson(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = response.headers.get('Content-Type')?.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    const error = new Error(data?.message || 'The request could not be completed.')
    error.status = response.status
    if (response.status === 401 && path !== '/api/users/login') {
      window.dispatchEvent(new Event('shiftease:session-ended'))
    }
    throw error
  }
  return data
}

export function postJson(path, body) {
  return requestJson(path, { method: 'POST', body })
}
