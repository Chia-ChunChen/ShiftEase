const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

let accessToken = null

export function setAccessToken(token) {
  accessToken = token || null
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function requestJson(path, { method = 'GET', body, signal } = {}) {
  const headers = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      signal,
      credentials: 'include',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error

    throw new ApiError(
      'Unable to reach the server. Check your connection and try again.',
      0,
    )
  }

  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new ApiError(
        'The server returned an unexpected response.',
        response.status,
      )
    }
  }

  if (!response.ok) {
    const defaultMessages = {
      400: 'Check the information and try again.',
      401: 'Please sign in again to continue.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested information could not be found.',
      409: 'This action conflicts with existing information.',
      500: 'The server could not complete the request.',
    }

    throw new ApiError(
      data?.message ||
        defaultMessages[response.status] ||
        'The request could not be completed.',
      response.status,
    )
  }
  return data
}

export function getJson(path, options = {}) {
  return requestJson(path, { ...options, method: 'GET' })
}

export function postJson(path, body, options = {}) {
  return requestJson(path, { ...options, method: 'POST', body })
}

export function putJson(path, body, options = {}) {
  return requestJson(path, { ...options, method: 'PUT', body })
}

export function deleteJson(path, options = {}) {
  return requestJson(path, { ...options, method: 'DELETE' })
}