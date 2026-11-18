import { useState } from 'react'
import { postJson } from '../services/apiClient.js'

export function useWeeklySave(endpoint, dateField) {
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function save(dates, hoursByDate) {
    const entries = dates.map(date => ({ [dateField]: date, ...hoursByDate[date] }))
    const invalid = entries.find(entry => !entry.startTime || !entry.endTime || entry.endTime <= entry.startTime)
    if (!entries.length || invalid) {
      setFeedback({
        variant: 'error',
        message: invalid
          ? `Enter a start time and a later end time for ${invalid[dateField]}.`
          : 'Select at least one date.',
      })
      return false
    }
    setSaving(true)
    setFeedback(null)
    try {
      const result = await postJson(endpoint, { entries })
      setFeedback({ variant: 'success', message: result.message })
      return true
    } catch (error) {
      setFeedback({ variant: 'error', message: error.message })
      return false
    } finally {
      setSaving(false)
    }
  }

  return { saving, feedback, save }
}
