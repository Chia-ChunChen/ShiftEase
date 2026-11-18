import { useState } from 'react'
import { dateKey, validStart } from '../availabilityRules.js'

const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2026, index, 1)))
const blockOf = (year) => 2020 + Math.floor((year - 2020) / 6) * 6

export default function AvailabilityCalendar({ initialDate, onSelect, onClose }) {
  const initial = new Date(`${initialDate}T12:00:00`)
  const [view, setView] = useState('days')
  const [year, setYear] = useState(initial.getFullYear())
  const [month, setMonth] = useState(initial.getMonth())
  const [block, setBlock] = useState(blockOf(initial.getFullYear()))
  const [ranges, setRanges] = useState(blockOf(initial.getFullYear()))
  const first = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const heading = view === 'days' ? `${months[month]} ${year}` : view === 'months' ? `${year}` : view === 'years' ? `${block}–${block + 5}` : `${ranges}–${ranges + 35}`

  function move(direction) {
    if (view === 'days') {
      const next = new Date(year, month + direction, 1)
      setYear(next.getFullYear()); setMonth(next.getMonth())
    } else if (view === 'months') setYear((value) => value + direction)
    else if (view === 'years') setBlock((value) => value + direction * 6)
    else setRanges((value) => value + direction * 36)
  }

  function parent() {
    if (view === 'days') setView('months')
    else {
      setRanges(view === 'years' ? block : blockOf(year))
      setView('ranges')
    }
  }

  return (
    <section className="av-calendar" aria-label="Select period starting">
      <div className="av-calendar-nav">
        <button type="button" aria-label="Previous calendar period" onClick={() => move(-1)}>‹</button>
        {view === 'ranges' ? <strong>{heading}</strong> : <button type="button" onClick={parent}>{heading}</button>}
        <button type="button" aria-label="Next calendar period" onClick={() => move(1)}>›</button>
      </div>
      {view === 'days' && <div className="av-calendar-days">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
        {Array.from({ length: first }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: count }, (_, index) => {
          const date = new Date(year, month, index + 1)
          const key = dateKey(date)
          return <button key={key} type="button" disabled={!validStart(key)} aria-label={date.toLocaleDateString('en-US', { dateStyle: 'full' })} onClick={() => onSelect(key)}>{index + 1}</button>
        })}
      </div>}
      {view === 'months' && <div className="av-calendar-options">{months.map((name, index) => <button key={name} type="button" onClick={() => { setMonth(index); setView('days') }}>{name}</button>)}</div>}
      {view === 'ranges' && <div className="av-calendar-options">{Array.from({ length: 6 }, (_, index) => {
        const start = ranges + index * 6
        return <button key={start} type="button" onClick={() => { setBlock(start); setView('years') }}>{start}–{start + 5}</button>
      })}</div>}
      {view === 'years' && <div className="av-calendar-options">{Array.from({ length: 6 }, (_, index) => <button key={index} type="button" onClick={() => { setYear(block + index); setView('months') }}>{block + index}</button>)}</div>}
      <p>Please select a start date at least 8 days from now.</p>
      <button type="button" onClick={onClose}>Close calendar</button>
    </section>
  )
}
