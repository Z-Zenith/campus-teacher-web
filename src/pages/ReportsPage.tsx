import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { createReport, getStudentsInSection } from '@/lib/api'
import { useActiveSection } from '@/lib/activeSection'
import { reportApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

type ReportScope = 'section' | 'student'

// TWA-11 — a teacher reports on either the whole active section or one student within it.
// Both selectors read the same global active-section context every other page uses (no
// independent per-page section picker), and the student picker cascades from that section
// via the roster-by-section endpoint (PR 2) instead of a raw GUID text box.
export function ReportsPage() {
  const { sectionId, sectionName, assignedSections, isLoading: sectionLoading } = useActiveSection()
  const [scope, setScope] = useState<ReportScope>('section')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [content, setContent] = useState('')

  const roster = useQuery({
    queryKey: ['timetable', 'sections', sectionId, 'roster'],
    queryFn: () => getStudentsInSection(sectionId!),
    enabled: !!sectionId && scope === 'student',
  })

  const selectedStudent = roster.data?.find((s) => s.studentId === studentId)

  const createReportMutation = useMutation({
    mutationFn: () =>
      createReport({
        sectionId: scope === 'section' ? sectionId : null,
        studentId: scope === 'student' ? studentId : null,
        content,
      }),
    onSuccess: () => {
      toast.success('Report submitted to Admin.')
      setContent('')
      setStudentId(null)
    },
    onError: (err) => reportApiError(err, 'Failed to submit report.'),
  })

  const canSubmit =
    content.trim().length > 0 &&
    !!sectionId &&
    (scope === 'section' || !!studentId) &&
    !createReportMutation.isPending

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Report a section or student</CardTitle>
          <CardDescription>Routes directly to the Admin inbox (TWA-11).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sectionLoading && <Skeleton className="h-9 w-full" />}
          {!sectionLoading && assignedSections.length === 0 && (
            <Alert>
              <AlertTitle>No sections scheduled yet</AlertTitle>
              <AlertDescription>Ask Admin to publish your timetable before filing a report.</AlertDescription>
            </Alert>
          )}
          {!sectionLoading && assignedSections.length > 0 && (
            <>
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-medium">Section</Label>
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
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-sm font-medium">Report about</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => {
                    setScope(v as ReportScope)
                    setStudentId(null)
                  }}
                >
                  <SelectTrigger className="w-fit min-w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="section">The whole section</SelectItem>
                    <SelectItem value="student">A specific student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scope === 'student' && (
                <div className="flex flex-col gap-1">
                  <Label className="text-sm font-medium">Student</Label>
                  <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={studentPickerOpen}
                        className="w-full justify-between font-normal"
                        disabled={!sectionId || roster.isLoading}
                      >
                        {selectedStudent
                          ? `${selectedStudent.fullName} (Roll ${selectedStudent.identifier})`
                          : roster.isLoading
                            ? 'Loading students…'
                            : 'Search by name or roll number…'}
                        <ChevronsUpDown className="opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                      <Command>
                        <CommandInput placeholder="Search by name or roll number…" />
                        <CommandList>
                          <CommandEmpty>No student found.</CommandEmpty>
                          <CommandGroup>
                            {roster.data?.map((s) => (
                              <CommandItem
                                key={s.studentId}
                                value={`${s.fullName} ${s.identifier}`}
                                onSelect={() => {
                                  setStudentId(s.studentId)
                                  setStudentPickerOpen(false)
                                }}
                              >
                                <Check className={cn('mr-2', studentId === s.studentId ? 'opacity-100' : 'opacity-0')} />
                                {s.fullName}{' '}
                                <span className="ml-1 text-xs text-muted-foreground">Roll {s.identifier}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Label className="text-sm font-medium">Report details</Label>
                <Textarea rows={4} placeholder="Describe the issue…" value={content} onChange={(e) => setContent(e.target.value)} />
              </div>

              <Button onClick={() => createReportMutation.mutate()} disabled={!canSubmit} className="w-fit">
                {createReportMutation.isPending ? 'Submitting…' : 'Submit report'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
