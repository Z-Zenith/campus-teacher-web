import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  createAssignment,
  triggerPlagiarismCheck,
  getPlagiarismReport,
  isResolvedPlagiarismReport,
  ApiError,
  type AssignmentType,
  type PlagiarismReport,
} from '@/lib/api'

// TWA-07 — a teacher creates code/quiz/essay/file-upload assignments, specifying type,
// due date, and submission window. Backend: AssignmentsController.Create (already on main).
export function AssignmentsPage() {
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<AssignmentType>('Code')
  const [dueDate, setDueDate] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const createAssignmentMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: (assignment) => {
      setMessage(`"${assignment.title}" created.`)
      setError(null)
      setTitle('')
      setDescription('')
      setDueDate('')
      setWindowStart('')
      setWindowEnd('')
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof ApiError ? `Failed to create assignment: ${err.message || err.status}` : 'Failed to create assignment.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    createAssignmentMutation.mutate({
      subjectId,
      title,
      description: description.trim() ? description.trim() : null,
      type,
      dueDate: new Date(dueDate).toISOString(),
      submissionWindowStart: new Date(windowStart).toISOString(),
      submissionWindowEnd: new Date(windowEnd).toISOString(),
    })
  }

  const canSubmit =
    Boolean(subjectId.trim() && title.trim() && dueDate && windowStart && windowEnd) && !createAssignmentMutation.isPending

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Create an assignment</CardTitle>
          <CardDescription>TWA-07 — specify type, due date, and submission window.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-sm text-muted-foreground">Subject ID</label>
            <input
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Subject ID (GUID)"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            />

            <label className="text-sm text-muted-foreground">Type</label>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as AssignmentType)}
            >
              <option value="Code">Code</option>
              <option value="Quiz">Quiz</option>
              <option value="Essay">Essay</option>
              <option value="FileUpload">File upload</option>
            </select>

            <label className="text-sm text-muted-foreground">Title</label>
            <input
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Assignment title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label className="text-sm text-muted-foreground">Description (optional)</label>
            <textarea
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label className="text-sm text-muted-foreground">Due date</label>
            <input
              className="rounded-md border px-3 py-2 text-sm"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <label className="text-sm text-muted-foreground">Submission window start</label>
            <input
              className="rounded-md border px-3 py-2 text-sm"
              type="datetime-local"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
            />

            <label className="text-sm text-muted-foreground">Submission window end</label>
            <input
              className="rounded-md border px-3 py-2 text-sm"
              type="datetime-local"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
            />

            <Button type="submit" disabled={!canSubmit}>
              {createAssignmentMutation.isPending ? 'Creating…' : 'Create assignment'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </form>
        </CardContent>
      </Card>

      <PlagiarismCheckCard />
    </div>
  )
}

// AIS-02 — a teacher checks a single submission for internet plagiarism via Copyleaks.
// This app has no "list submissions for grading" endpoint yet (AssignmentsController only
// exposes per-submission routes), so the teacher identifies the submission by id here,
// same as the subjectId/GUID inputs above — once a submissions list exists elsewhere in
// the app this card's input can be replaced with a per-row action.
function PlagiarismCheckCard() {
  const [submissionId, setSubmissionId] = useState('')
  const [report, setReport] = useState<PlagiarismReport | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const triggerMutation = useMutation({
    mutationFn: triggerPlagiarismCheck,
    onSuccess: () => {
      setReportError(null)
      setReport({ submissionId, status: 'pending' })
    },
    onError: (err) => {
      setReport(null)
      setReportError(err instanceof ApiError ? `Failed to start plagiarism check: ${err.message || err.status}` : 'Failed to start plagiarism check.')
    },
  })

  const reportMutation = useMutation({
    mutationFn: getPlagiarismReport,
    onSuccess: (result) => {
      setReportError(null)
      setReport(result)
    },
    onError: (err) => {
      setReportError(err instanceof ApiError ? `Failed to load plagiarism report: ${err.message || err.status}` : 'Failed to load plagiarism report.')
    },
  })

  const canQuery = Boolean(submissionId.trim()) && !triggerMutation.isPending && !reportMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plagiarism check</CardTitle>
        <CardDescription>
          AIS-02 — scans a submission against internet sources via Copyleaks. Results shown here are not
          shared with the submitting student.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <label className="text-sm text-muted-foreground">Submission ID</label>
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Submission ID (GUID)"
          value={submissionId}
          onChange={(e) => setSubmissionId(e.target.value)}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!canQuery}
            onClick={() => triggerMutation.mutate(submissionId)}
          >
            {triggerMutation.isPending ? 'Starting…' : 'Check for plagiarism'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canQuery}
            onClick={() => reportMutation.mutate(submissionId)}
          >
            {reportMutation.isPending ? 'Loading…' : 'View report'}
          </Button>
        </div>

        {reportError && <p className="text-sm text-destructive">{reportError}</p>}

        {report && !isResolvedPlagiarismReport(report) && (
          <p className="text-sm text-muted-foreground">
            Scan pending — Copyleaks hasn't returned a result yet. Check back shortly.
          </p>
        )}

        {report && isResolvedPlagiarismReport(report) && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{Math.round(report.similarityScore * 100)}% similarity</p>
            {report.matchedSources.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {report.matchedSources.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer" className="underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Visible to teachers/admins only — not shown to the submitting student.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
