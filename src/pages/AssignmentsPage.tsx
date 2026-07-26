import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { createAssignment, getMyAssignments, type AssignmentType } from '@/lib/api'
import { useActiveSection } from '@/lib/activeSection'
import { useTaughtSubjects } from '@/lib/useTaughtSubjects'
import { reportApiError } from '@/lib/errors'

// TWA-07 — assignment list, with creation in a dialog. Row click goes to the assignment
// detail page, whose Grading tab is where "grading in the assignment tab itself" lives —
// there's no separate top-level Grading nav item.
export function AssignmentsPage() {
  const queryClient = useQueryClient()
  const { sectionId, sectionName, assignedSections, isLoading: sectionLoading } = useActiveSection()
  const subjects = useTaughtSubjects(sectionId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<AssignmentType>('Code')
  const [dueDate, setDueDate] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [typeSpecificSettings, setTypeSpecificSettings] = useState('')

  const assignmentsQuery = useQuery({ queryKey: ['assignments', 'mine'], queryFn: getMyAssignments })

  const createAssignmentMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: (assignment) => {
      toast.success(`"${assignment.title}" created.`)
      queryClient.invalidateQueries({ queryKey: ['assignments', 'mine'] })
      setDialogOpen(false)
      setTitle('')
      setDescription('')
      setDueDate('')
      setWindowStart('')
      setWindowEnd('')
      setTypeSpecificSettings('')
    },
    onError: (err) => reportApiError(err, 'Failed to create assignment.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createAssignmentMutation.mutate({
      subjectId,
      title,
      description: description.trim() ? description.trim() : null,
      type,
      dueDate: new Date(dueDate).toISOString(),
      submissionWindowStart: new Date(windowStart).toISOString(),
      submissionWindowEnd: new Date(windowEnd).toISOString(),
      typeSpecificSettings: typeSpecificSettings.trim() ? typeSpecificSettings.trim() : null,
    })
  }

  // Due date is required both here and server-side (AssignmentsController.Create rejects a
  // default DateTime) — TWA-07's "an assignment with no due date cannot be published" AC.
  const canSubmit =
    Boolean(subjectId.trim() && title.trim() && dueDate && windowStart && windowEnd) && !createAssignmentMutation.isPending

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>TWA-07 — click an assignment to view submissions and grade.</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!sectionLoading && assignedSections.length === 0}>New assignment</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create an assignment</DialogTitle>
                <DialogDescription>Specify type, due date, and submission window.</DialogDescription>
              </DialogHeader>
              {sectionLoading && <Skeleton className="h-9 w-full" />}
              {!sectionLoading && assignedSections.length === 0 && (
                <Alert>
                  <AlertTitle>No sections scheduled yet</AlertTitle>
                  <AlertDescription>Ask Admin to publish your timetable before creating assignments.</AlertDescription>
                </Alert>
              )}
              {!sectionLoading && assignedSections.length > 0 && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <Label className="text-muted-foreground">Section</Label>
                  <p className="text-sm">
                    {sectionId ? sectionName : 'No section selected'}{' '}
                    <span className="text-xs text-muted-foreground">— switch via the top nav</span>
                  </p>

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

                  <Label className="text-muted-foreground">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AssignmentType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Code">Code</SelectItem>
                      <SelectItem value="Quiz">Quiz</SelectItem>
                      <SelectItem value="Essay">Essay</SelectItem>
                      <SelectItem value="FileUpload">File upload</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label className="text-muted-foreground">Title</Label>
                  <Input placeholder="Assignment title" value={title} onChange={(e) => setTitle(e.target.value)} />

                  <Label className="text-muted-foreground">Description (optional)</Label>
                  <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

                  <Label className="text-muted-foreground">Due date</Label>
                  <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

                  <Label className="text-muted-foreground">Submission window start</Label>
                  <Input type="datetime-local" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />

                  <Label className="text-muted-foreground">Submission window end</Label>
                  <Input type="datetime-local" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />

                  <Label className="text-muted-foreground">
                    Type-specific settings (optional JSON — quiz question bank, code starter files, etc.)
                  </Label>
                  <Textarea
                    placeholder="{}"
                    value={typeSpecificSettings}
                    onChange={(e) => setTypeSpecificSettings(e.target.value)}
                  />

                  <Button type="submit" disabled={!canSubmit}>
                    {createAssignmentMutation.isPending ? 'Creating…' : 'Create assignment'}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {assignmentsQuery.isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {assignmentsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No assignments yet — create one to get started.</p>
          )}
          {assignmentsQuery.data && assignmentsQuery.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsQuery.data.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell>
                      <Link to={`/assignments/${a.id}`} className="font-medium hover:underline">
                        {a.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.subjectName}</TableCell>
                    <TableCell className="text-muted-foreground">{a.type}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(a.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{a.submissionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
