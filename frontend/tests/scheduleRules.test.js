import assert from 'node:assert/strict'
import { test } from 'node:test'
import { copyDayHours, filterUnsavedScheduleEntries } from '../src/features/schedules/scheduleRules.js'

test('Copy to fills multiple date drafts, leaves the source independent, and never saves data', () => {
  const original = { '2026-12-07': { startTime: '08:00', endTime: '18:00' } }
  const result = copyDayHours(original, '2026-12-07', ['2026-12-08', '2026-12-09'])
  assert.deepEqual(result['2026-12-08'], original['2026-12-07'])
  assert.deepEqual(Object.keys(original), ['2026-12-07'])
  result['2026-12-08'].startTime = '10:00'
  assert.equal(result['2026-12-09'].startTime, '08:00')
  assert.equal(original['2026-12-07'].startTime, '08:00')
})

test('Copy to protects existing drafts unless Replace is explicitly chosen', () => {
  const hours = { monday: { startTime: '08:00', endTime: '18:00' }, tuesday: { startTime: '09:00', endTime: '17:00' } }
  assert.throws(() => copyDayHours(hours, 'monday', ['tuesday']), /already has draft hours/)
  assert.equal(hours.tuesday.startTime, '09:00')
  assert.equal(copyDayHours(hours, 'monday', ['tuesday'], true).tuesday.startTime, '08:00')
  assert.throws(() => copyDayHours({ monday: { startTime: '18:00', endTime: '08:00' } }, 'monday', ['tuesday']), /valid work hours/)
  assert.throws(() => copyDayHours(hours, 'monday', []), /at least one/)
})

test('Saving a batch skips dates that already have saved work days', () => {
  const entries = [
    { shiftDate: '2026-12-21', startTime: '09:00', endTime: '17:00' },
    { shiftDate: '2026-12-22', startTime: '09:00', endTime: '17:00' },
    { shiftDate: '2026-12-24', startTime: '09:00', endTime: '17:00' },
    { shiftDate: '2026-12-25', startTime: '09:00', endTime: '17:00' }
  ]
  const schedules = [{ shiftDate: '2026-12-24T00:00:00.000Z', startTime: '09:00', endTime: '17:00' }]

  assert.deepEqual(filterUnsavedScheduleEntries(entries, schedules), [entries[0], entries[1], entries[3]])
  assert.equal(entries.length, 4)
})
