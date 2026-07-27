import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createAssignment, triggerAiDetection, ApiError, type AssignmentType } from '@/lib/api'

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

      <AiDetectionCard />
    </div>
  )
}

// AIS-05 — a teacher checks a single submission for AI-generated content via Pangram.
// This app has no "list submissions for grading" endpoint yet (AssignmentsController only
// exposes per-submission routes), so the teacher identifies the submission by id here,
// same as the subjectId/GUID input above — once a submissions list exists elsewhere in
// the app this card's input can be replaced with a per-row action.
function AiDetectionCard() {
  const [submissionId, setSubmissionId] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [detectionError, setDetectionError] = useState<string | null>(null)

  const detectMutation = useMutation({
    mutationFn: triggerAiDetection,
    onSuccess: (report) => {
      setDetectionError(null)
      setScore(report.aiLikelihoodScore)
      setCheckedAt(report.checkedAt)
    },
    onError: (err) => {
      setScore(null)
      setCheckedAt(null)
      setDetectionError(
        err instanceof ApiError ? `Failed to run AI-content detection: ${err.message || err.status}` : 'Failed to run AI-content detection.',
      )
    },
  })

  const canCheck = Boolean(submissionId.trim()) && !detectMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-content likelihood</CardTitle>
        <CardDescription>
          AIS-05 — scores a submission for likely AI-generated content via Pangram. Results shown here
          are not shared with the submitting student.
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

        <Button type="button" disabled={!canCheck} onClick={() => detectMutation.mutate(submissionId)}>
          {detectMutation.isPending ? 'Checking…' : 'Check AI-content likelihood'}
        </Button>

        {detectionError && <p className="text-sm text-destructive">{detectionError}</p>}

        {score !== null && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">AI-likelihood signal: {Math.round(score * 100)}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This is one signal among several — not proof, and never a standalone misconduct verdict.
              AI-detection tools carry a documented false-positive bias against non-native English
              writers, so weigh this alongside the student's submission history and other evidence
              before drawing any conclusion.
            </p>
            {checkedAt && (
              <p className="mt-2 text-xs text-muted-foreground">Checked {new Date(checkedAt).toLocaleString()}.</p>
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
