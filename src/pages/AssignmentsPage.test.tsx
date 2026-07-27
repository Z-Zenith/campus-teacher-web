import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssignmentsPage } from './AssignmentsPage'
import * as api from '@/lib/api'

// AIS-02 — plagiarism report UI. Covers: triggering a check calls the trigger endpoint,
// a pending report renders a pending message (not a score), and a resolved report
// renders the similarity score plus matched source links.
vi.mock('@/lib/api', () => ({
  createAssignment: vi.fn(),
  triggerPlagiarismCheck: vi.fn(),
  getPlagiarismReport: vi.fn(),
  isResolvedPlagiarismReport: (report: unknown) =>
    typeof report === 'object' && report !== null && 'similarityScore' in report,
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

describe('AssignmentsPage plagiarism check (AIS-02)', () => {
  beforeEach(() => {
    vi.mocked(api.triggerPlagiarismCheck).mockResolvedValue({
      submissionId: 'sub-1',
      scanId: 'scan-1',
      status: 'pending',
    })
  })

  it('triggers a plagiarism check for the entered submission id', async () => {
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Submission ID (GUID)'), {
      target: { value: 'sub-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check for plagiarism' }))

    await waitFor(() => expect(api.triggerPlagiarismCheck).toHaveBeenCalledWith('sub-1', expect.anything()))
    await screen.findByText(/Scan pending/)
  })

  it('renders a pending state when the report has not resolved yet', async () => {
    vi.mocked(api.getPlagiarismReport).mockResolvedValue({ submissionId: 'sub-1', status: 'pending' })
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Submission ID (GUID)'), {
      target: { value: 'sub-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'View report' }))

    await screen.findByText(/Scan pending — Copyleaks hasn't returned a result yet\./)
    expect(screen.queryByText(/% similarity/)).not.toBeInTheDocument()
  })

  it('renders the similarity score and matched sources once the report resolves', async () => {
    vi.mocked(api.getPlagiarismReport).mockResolvedValue({
      id: 'report-1',
      submissionId: 'sub-1',
      similarityScore: 0.62,
      copyleaksScanId: 'scan-1',
      matchedSources: ['https://example.com/a'],
      checkedAt: '2026-01-01T00:00:00Z',
    })
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Submission ID (GUID)'), {
      target: { value: 'sub-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'View report' }))

    await screen.findByText('62% similarity')
    expect(screen.getByRole('link', { name: 'https://example.com/a' })).toHaveAttribute(
      'href',
      'https://example.com/a',
    )
    expect(screen.getByText(/not shown to the submitting student/)).toBeInTheDocument()
  })
})
