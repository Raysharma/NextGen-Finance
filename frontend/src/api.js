const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function readError(response) {
  try {
    const payload = await response.json()
    return payload.detail || payload.message || 'Request failed'
  } catch {
    return 'Request failed'
  }
}

export async function request(path, { method = 'GET', token, body, form } = {}) {
  const headers = {}
  let payload

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (form) {
    payload = new URLSearchParams(form)
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: payload,
    })
  } catch (err) {
    throw new Error(`Network error: could not reach API at ${API_URL}. Is the backend running?`)
  }

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export async function downloadFile(path, { token } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('content-disposition') || ''
  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return {
    blob,
    filename: match?.[1] || 'statement.pdf',
  }
}

export { API_URL }
