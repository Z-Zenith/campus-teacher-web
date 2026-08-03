import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalendarGrid, slotsForCell } from './CalendarGrid'
import type { TimetableSlotDto } from '@/lib/api'

function slot(overrides: Partial<TimetableSlotDto>): TimetableSlotDto {
  return {
    id: 'slot-1',
    dayOfWeek: 1,
    startTime: '09:00:00',
    endTime: '10:00:00',
    sectionId: 'section-1',
    sectionName: '10-A',
    subjectId: 'subject-1',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'Ms. Rao',
    room: 'R101',
    manuallyEdited: false,
    ...overrides,
  }
}

// #15 — two sub-hour sessions starting within the same clock hour (e.g. 09:00 and 09:50)
// must both render; previously CalendarGrid used a single `slots.find()` per (dayOfWeek,
// hour) cell, so the second slot silently overwrote/hid the first.
describe('slotsForCell (#15)', () => {
  it('returns every slot that falls in the same (dayOfWeek, hour) bucket, sorted by start time', () => {
    const slotA = slot({ id: 'slot-a', startTime: '09:00:00', subjectName: 'Mathematics' })
    const slotB = slot({ id: 'slot-b', startTime: '09:50:00', subjectName: 'Physics' })

    expect(slotsForCell([slotA, slotB], 1, 9)).toEqual([slotA, slotB])
  })

  it('does not drop the earlier slot when slots are passed out of order', () => {
    const slotA = slot({ id: 'slot-a', startTime: '09:00:00' })
    const slotB = slot({ id: 'slot-b', startTime: '09:50:00' })

    expect(slotsForCell([slotB, slotA], 1, 9)).toEqual([slotA, slotB])
  })

  it('excludes slots from a different day or hour', () => {
    const slotA = slot({ id: 'slot-a', dayOfWeek: 1, startTime: '09:00:00' })
    const slotB = slot({ id: 'slot-b', dayOfWeek: 2, startTime: '09:00:00' })
    const slotC = slot({ id: 'slot-c', dayOfWeek: 1, startTime: '11:00:00' })

    expect(slotsForCell([slotA, slotB, slotC], 1, 9)).toEqual([slotA])
  })
})

describe('CalendarGrid (#15)', () => {
  it('renders both sessions when two sessions start within the same clock hour', () => {
    const slotA = slot({ id: 'slot-a', startTime: '09:00:00', subjectName: 'Mathematics' })
    const slotB = slot({ id: 'slot-b', startTime: '09:50:00', subjectName: 'Physics' })

    render(<CalendarGrid slots={[slotA, slotB]} />)

    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('Physics')).toBeInTheDocument()
  })
})
