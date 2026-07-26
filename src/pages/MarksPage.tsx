import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ApiError,
  getInternalMarksRoster,
  submitInternalMark,
  type InternalMarksRosterEntry,
} from '@/lib/api'
import { useActiveSection } from '@/lib/activeSection'
import { useTaughtSubjects } from '@/lib/useTaughtSubjects'
import { extractErrorMessage, reportApiError } from '@/lib/errors'

// Kept as an alias so the existing MarksPage.test.ts import (`import { backendErrorMessage }
// from './MarksPage'`) keeps working — the logic itself now lives in lib/errors.ts so every
// page can share it, not just this one.
export const backendErrorMessage = extractErrorMessage

export function MarksPage() {
  const { sectionId, sectionName, assignedSections, isLoading: sectionLoading } = useActiveSection()
  const [subjectId, setSubjectId] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()

  // Section is the primary selector (read from the same global active-section switcher used
  // app-wide, not an independent dropdown) — subjects are then filtered to what's actually
  // taught in that section, fixing the bug where a teacher teaching the same subject to two
  // sections previously saw both sections' students intermixed with no way to tell them apart.
  const subjects = useTaughtSubjects(sectionId)

  const trimmedAssignmentId = assignmentId.trim() || undefined

  const roster = useQuery({
    queryKey: ['marks', 'internal', 'roster', subjectId, trimmedAssignmentId, sectionId],
    queryFn: () => getInternalMarksRoster(subjectId, trimmedAssignmentId, sectionId ?? undefined),
    enabled: !!subjectId && !!sectionId,
  })

  const rosterQueryKey = ['marks', 'internal', 'roster', subjectId, trimmedAssignmentId, sectionId]

  const marksMutation = useMutation({
    mutationFn: submitInternalMark,
    onSuccess: (record) => {
      toast.success(
        record.published
          ? 'Marks published — now visible to the student (TWA-16).'
          : 'Marks saved — still hidden from the student until published.',
      )
      queryClient.invalidateQueries({ queryKey: rosterQueryKey })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("You don't have permission to enter marks for this subject/section.")
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
    if (raw.trim() === '' || Number.isNaN(marks)) {
      toast.error('Enter a numeric mark before saving.')
      return
    }
    // Mirrors MarksController.CreateInternal's `if (request.Marks < 0) return BadRequest(...)`
    // (campus-backend/Controllers/MarksController.cs) — reject client-side with the same rule
    // instead of round-tripping to the server just to learn it's invalid.
    if (marks < 0) {
      toast.error('Marks must not be negative.')
      return
    }
    marksMutation.mutate({
      studentId: entry.studentId,
      subjectId,
      assignmentId: trimmedAssignmentId,
      marks,
      publish,
    })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Publish internal marks</CardTitle>
          <CardDescription>
            Marks stay hidden from the student until you explicitly publish them (TWA-16).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sectionLoading && <Skeleton className="h-9 w-full" />}
          {!sectionLoading && assignedSections.length === 0 && (
            <Alert>
              <AlertTitle>No sections scheduled yet</AlertTitle>
              <AlertDescription>Ask Admin to publish your timetable before entering marks.</AlertDescription>
            </Alert>
          )}
          {!sectionLoading && assignedSections.length > 0 && (
            <>
              <Label className="text-muted-foreground">Section</Label>
              {sectionId ? (
                <p className="text-sm">
                  {sectionName}{' '}
                  <span className="text-xs text-muted-foreground">
                    — switch classes using the "Section:" selector in the top nav
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No section selected — pick one from the "Section:" selector in the top nav.
                </p>
              )}

              <Label className="text-muted-foreground">Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!sectionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a subject…" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label className="text-muted-foreground">
                Assignment ID (optional — leave blank for a subject-level mark)
              </Label>
              <Input
                placeholder="Assignment ID"
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {subjectId && sectionId && (
        <Card>
          <CardHeader>
            <CardTitle>Enter marks</CardTitle>
            <CardDescription>Only students in {sectionName} are listed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {roster.isLoading && (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {roster.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {roster.error instanceof ApiError && roster.error.status === 403
                    ? "You don't have permission to enter marks for this subject/section."
                    : 'Could not load roster.'}
                </AlertDescription>
              </Alert>
            )}
            {roster.data?.length === 0 && <p className="text-sm text-muted-foreground">No students enrolled.</p>}
            {roster.data?.map((entry) => (
              <div key={entry.studentId} className="flex items-center gap-3 border-b pb-3 last:border-b-0">
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
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
