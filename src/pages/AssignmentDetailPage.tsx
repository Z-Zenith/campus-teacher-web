import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  getMyAssignments,
  getAssignmentSubmissions,
  getInternalMarksRoster,
  submitInternalMark,
  getPlagiarismReport,
  ApiError,
  type InternalMarksRosterEntry,
  type AssignmentSubmissionStatusDto,
} from '@/lib/api'
import { reportApiError } from '@/lib/errors'
import { useState } from 'react'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  Submitted: 'default',
  Late: 'destructive',
  Missing: 'secondary',
}

// TWA-07 — assignment detail: Details / Submissions / Grading in one page, so "grading in
// the assignment tab itself" has a real home instead of a separate top-level nav item.
export function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()

  // No single-assignment GET endpoint exists — reusing the same ['assignments','mine'] query
  // key as the list page means this is served from cache when navigated to via a row click,
  // and still resolves correctly on a direct link/refresh (just costs one extra fetch).
  const assignmentsQuery = useQuery({ queryKey: ['assignments', 'mine'], queryFn: getMyAssignments })
  const assignment = assignmentsQuery.data?.find((a) => a.id === id)

  const submissionsQuery = useQuery({
    queryKey: ['assignments', id, 'submissions'],
    queryFn: () => getAssignmentSubmissions(id!),
    enabled: !!id,
  })

  if (assignmentsQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Alert variant="destructive">
          <AlertDescription>Assignment not found, or you don't have access to it.</AlertDescription>
        </Alert>
        <Link to="/assignments" className="mt-4 inline-block text-sm underline">
          Back to assignments
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <Link to="/assignments" className="text-sm text-muted-foreground hover:underline">
          ← Assignments
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">{assignment.subjectName}</p>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Type:</span> {assignment.type}
              </p>
              <p>
                <span className="text-muted-foreground">Due:</span> {new Date(assignment.dueDate).toLocaleString()}
              </p>
              <p>
                <span className="text-muted-foreground">Submissions so far:</span> {assignment.submissionCount}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>Every student in a section this subject is taught to, and their status.</CardDescription>
            </CardHeader>
            <CardContent>
              {submissionsQuery.isLoading && <Skeleton className="h-32 w-full" />}
              {submissionsQuery.data && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissionsQuery.data.map((row) => (
                      <TableRow key={row.studentId}>
                        <TableCell>{row.studentName}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                          {row.isAutosubmitted && (
                            <span className="ml-2 text-xs text-muted-foreground">(auto-submitted)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading">
          <GradingTab
            assignmentId={assignment.id}
            subjectId={assignment.subjectId}
            submissions={submissionsQuery.data ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Reuses the same internal-marks roster/submit endpoints MarksPage (TWA-16) uses, scoped to
// this one assignment via assignmentId — "grading" an assignment submission is entering its
// internal mark, not a separate concept with its own storage.
function GradingTab({
  assignmentId,
  subjectId,
  submissions,
}: {
  assignmentId: string
  subjectId: string
  submissions: AssignmentSubmissionStatusDto[]
}) {
  const submissionIdByStudent = new Map(submissions.map((s) => [s.studentId, s.submissionId]))

  const queryClient = useQueryClient()
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({})

  const rosterQueryKey = ['marks', 'internal', 'roster', subjectId, assignmentId, undefined]
  const roster = useQuery({
    queryKey: rosterQueryKey,
    queryFn: () => getInternalMarksRoster(subjectId, assignmentId),
  })

  const marksMutation = useMutation({
    mutationFn: submitInternalMark,
    onSuccess: (record) => {
      toast.success(record.published ? 'Marks published.' : 'Marks saved — not yet published.')
      queryClient.invalidateQueries({ queryKey: rosterQueryKey })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("You don't have permission to grade this assignment.")
        return
      }
      reportApiError(err, 'Failed to save marks.')
    },
  })

  const valueFor = (entry: InternalMarksRosterEntry) =>
    draftMarks[entry.studentId] ?? (entry.marks !== null ? String(entry.marks) : '')

  const handleSave = (entry: InternalMarksRosterEntry, publish: boolean) => {
    const raw = valueFor(entry)
    const marks = Number(raw)
    if (raw.trim() === '' || Number.isNaN(marks) || marks < 0) {
      toast.error('Enter a valid, non-negative mark before saving.')
      return
    }
    marksMutation.mutate({ studentId: entry.studentId, subjectId, assignmentId, marks, publish })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grading</CardTitle>
        <CardDescription>Enter marks per student — this is the same publish gate as Marks entry (TWA-16).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {roster.isLoading && <Skeleton className="h-32 w-full" />}
        {roster.data?.length === 0 && <p className="text-sm text-muted-foreground">No students enrolled.</p>}
        {roster.data?.map((entry) => (
          <div key={entry.studentId} className="flex flex-col gap-3 border-b pb-3 last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{entry.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.published ? `Published${entry.publishedAt ? ` ${new Date(entry.publishedAt).toLocaleString()}` : ''}` : 'Not published'}
                </p>
              </div>
              <Input
                className="w-24"
                type="number"
                inputMode="decimal"
                placeholder="Marks"
                value={valueFor(entry)}
                onChange={(e) => setDraftMarks((prev) => ({ ...prev, [entry.studentId]: e.target.value }))}
              />
              <Button variant="outline" onClick={() => handleSave(entry, false)} disabled={marksMutation.isPending}>
                Save
              </Button>
              <Button onClick={() => handleSave(entry, true)} disabled={marksMutation.isPending}>
                Publish
              </Button>
            </div>
            {submissionIdByStudent.get(entry.studentId) && (
              <SubmissionSignals submissionId={submissionIdByStudent.get(entry.studentId)!} />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// AIS-02/AIS-05 signals, co-located with the submission (not a separate floating "AI
// Insights" panel) per the architecture doc's AIS-05 acceptance criterion: the score must be
// presented "as one signal alongside submission history, never as a standalone misconduct
// verdict." Deliberately avoids a color-coded pass/fail badge or any ranking/sort-by-
// suspicion affordance — either would itself be the standalone-verdict pattern the AC
// prohibits. The false-positive caveat (documented risk against non-native English writers,
// architecture doc Section 5) is always-visible text, not a tooltip, so it can't be missed
// on a hover-less/touch device.
function SubmissionSignals({ submissionId }: { submissionId: string }) {
  const report = useQuery({
    queryKey: ['submissions', submissionId, 'plagiarism-report'],
    queryFn: () => getPlagiarismReport(submissionId),
  })

  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs">
      <p className="font-medium text-muted-foreground">Submission signals</p>
      <div className="mt-1 flex flex-col gap-1">
        <p>
          <span className="text-muted-foreground">Internet plagiarism (AIS-02):</span>{' '}
          {report.isLoading && 'Checking…'}
          {report.data && report.data.similarityScore === undefined && 'Pending — Copyleaks scan not yet complete.'}
          {report.data?.similarityScore !== undefined && `${report.data.similarityScore}% similarity to internet sources`}
        </p>
        <p>
          <span className="text-muted-foreground">AI-generated content likelihood (AIS-05):</span> Not available in
          this deployment.
        </p>
      </div>
      <p className="mt-2 text-muted-foreground">
        These signals are one input among several (submission history, revision count) — never treat either score
        alone as proof of misconduct. AI-content detectors have a documented false-positive bias against non-native
        English writers.
      </p>
    </div>
  )
}
