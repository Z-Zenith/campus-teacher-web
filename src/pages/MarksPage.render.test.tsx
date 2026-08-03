import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MarksPage } from './MarksPage'
import * as api from '@/lib/api'

// Regression test for #14: an unsaved mark draft typed for one subject must not be shown
// (or submitted) for a different subject, even for the same student, once the Subject
// dropdown is switched. Previously draftMarks was keyed only by studentId, so valueFor()
// kept preferring the stale Subject-A draft over Subject-B's real, already-published mark.
vi.mock('@/lib/api', () => ({
  getMyTimetable: vi.fn(),
  getInternalMarksRoster: vi.fn(),
  submitInternalMark: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

const timetable = [
  {
    id: 'slot-a',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    sectionId: 'section-1',
    sectionName: '10-A',
    subjectId: 'subject-math',
    subjectName: 'Mathematics',
    teacherId: 't1',
    teacherName: 'Teacher',
    room: null,
    manuallyEdited: false,
  },
  {
    id: 'slot-b',
    dayOfWeek: 1,
    startTime: '11:00',
    endTime: '12:00',
    sectionId: 'section-1',
    sectionName: '10-A',
    subjectId: 'subject-physics',
    subjectName: 'Physics',
    teacherId: 't1',
    teacherName: 'Teacher',
    room: null,
    manuallyEdited: false,
  },
]

const rosterMath = [
  { studentId: 'student-x', studentName: 'Student X', marks: 50, published: true, publishedAt: null },
]
const rosterPhysics = [
  { studentId: 'student-x', studentName: 'Student X', marks: 70, published: true, publishedAt: null },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MarksPage />
    </QueryClientProvider>,
  )
}

describe('MarksPage (#14)', () => {
  beforeEach(() => {
    vi.mocked(api.getMyTimetable).mockResolvedValue(timetable)
    vi.mocked(api.getInternalMarksRoster).mockImplementation((subjectId: string) =>
      Promise.resolve(subjectId === 'subject-math' ? rosterMath : rosterPhysics),
    )
  })

  it('does not leak an unsaved draft for one subject into another subject for the same student', async () => {
    renderPage()

    const subjectSelect = await screen.findByDisplayValue('Select a subject…')

    // Wait for the subjects list (derived from the timetable query) to actually populate
    // the <option>s before selecting one — otherwise fireEvent.change on a <select> with no
    // matching <option> yet is a no-op in jsdom.
    await screen.findByRole('option', { name: 'Mathematics' })

    // Select Mathematics — the real published mark (50) loads.
    fireEvent.change(subjectSelect, { target: { value: 'subject-math' } })
    const input = await screen.findByPlaceholderText('Marks')
    await waitFor(() => expect(input).toHaveValue(50))

    // Type an unsaved draft, but never save/publish it.
    fireEvent.change(input, { target: { value: '999' } })
    expect(input).toHaveValue(999)

    // Switch to Physics without saving — the same student has a different real mark (70).
    fireEvent.change(subjectSelect, { target: { value: 'subject-physics' } })

    // Must show Physics's real mark, not the leftover Mathematics draft.
    await waitFor(() => expect(screen.getByPlaceholderText('Marks')).toHaveValue(70))
    expect(screen.queryByDisplayValue('999')).not.toBeInTheDocument()
  })
})
