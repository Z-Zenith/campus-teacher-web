import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssignmentsPage } from './AssignmentsPage'
import * as api from '@/lib/api'

// AIS-05 — AI-content detection UI. Covers: triggering a check calls the detection
// endpoint with the submission id, the resolved score renders, and the fairness-framing
// disclaimer copy (never a standalone misconduct verdict) is present alongside it.
vi.mock('@/lib/api', () => ({
  createAssignment: vi.fn(),
  triggerAiDetection: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AssignmentsPage />
    </QueryClientProvider>,
  )
}

describe('AssignmentsPage AI-content detection (AIS-05)', () => {
  beforeEach(() => {
    vi.mocked(api.triggerAiDetection).mockResolvedValue({
      id: 'report-1',
      submissionId: 'sub-1',
      aiLikelihoodScore: 0.81,
      pangramReportId: 'pangram-1',
      checkedAt: '2026-01-01T00:00:00Z',
    })
  })

  it('triggers AI-content detection for the entered submission id', async () => {
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Submission ID (GUID)'), {
      target: { value: 'sub-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check AI-content likelihood' }))

    await waitFor(() => expect(api.triggerAiDetection).toHaveBeenCalledWith('sub-1', expect.anything()))
  })

  it('renders the AI-likelihood score once the (synchronous) check resolves', async () => {
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Submission ID (GUID)'), {
      target: { value: 'sub-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check AI-content likelihood' }))

    await screen.findByText('AI-likelihood signal: 81%')
  })

  it('frames the score as one signal among several, never a standalone verdict', async () => {
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Submission ID (GUID)'), {
      target: { value: 'sub-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check AI-content likelihood' }))

    await screen.findByText('AI-likelihood signal: 81%')
    expect(screen.getByText(/not proof, and never a standalone misconduct verdict/)).toBeInTheDocument()
    expect(screen.getByText(/false-positive bias against non-native English writers/)).toBeInTheDocument()
    expect(screen.getByText(/not shown to the submitting student/)).toBeInTheDocument()
  })
})
