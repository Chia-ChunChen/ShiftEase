const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

export async function postJson(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'The request could not be completed.');
  }

  return data;
}
