import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { getStudentsInSection, getStudentProfile, ApiError } from '@/lib/api'
import { useActiveSection } from '@/lib/activeSection'
import { cn } from '@/lib/utils'

// New TWA feature (no feature ID assigned yet — flagged for Ruthvik to formalize in the
// architecture doc, closest precedent AWA-07/AWA-08). Scoped to a teacher's own students —
// backend: UsersController.GetProfile's teacher-own-student authorization path.
export function StudentPerformancePage() {
  const { sectionId, sectionName, assignedSections, isLoading: sectionLoading } = useActiveSection()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const roster = useQuery({
    queryKey: ['timetable', 'sections', sectionId, 'roster'],
    queryFn: () => getStudentsInSection(sectionId!),
    enabled: !!sectionId,
  })
  const selectedStudent = roster.data?.find((s) => s.studentId === studentId)

  const profile = useQuery({
    queryKey: ['users', studentId, 'profile'],
    queryFn: () => getStudentProfile(studentId!),
    enabled: !!studentId,
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Student performance</CardTitle>
          <CardDescription>View marks for a student in a section you teach.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sectionLoading && <Skeleton className="h-9 w-full" />}
          {!sectionLoading && assignedSections.length === 0 && (
            <Alert>
              <AlertTitle>No sections scheduled yet</AlertTitle>
              <AlertDescription>Ask Admin to publish your timetable before viewing student performance.</AlertDescription>
            </Alert>
          )}
          {!sectionLoading && assignedSections.length > 0 && (
            <>
              <Label className="text-muted-foreground">Section</Label>
              <p className="text-sm">
                {sectionId ? sectionName : 'No section selected'}{' '}
                <span className="text-xs text-muted-foreground">— switch via the "Section:" selector in the top nav</span>
              </p>

              <Label className="text-muted-foreground">Student</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
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
                              setPickerOpen(false)
                            }}
                          >
                            <Check className={cn('mr-2', studentId === s.studentId ? 'opacity-100' : 'opacity-0')} />
                            {s.fullName} <span className="ml-1 text-xs text-muted-foreground">Roll {s.identifier}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </>
          )}
        </CardContent>
      </Card>

      {studentId && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedStudent?.fullName ?? 'Performance'}</CardTitle>
            <CardDescription>Published internal and external marks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {profile.isLoading && <Skeleton className="h-32 w-full" />}
            {profile.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {profile.error instanceof ApiError && profile.error.status === 403
                    ? "You don't have access to this student's performance — they must be enrolled in a section you teach."
                    : 'Could not load performance data.'}
                </AlertDescription>
              </Alert>
            )}
            {profile.data && (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Internal marks</h3>
                  {profile.data.internalMarks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No published internal marks yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Marks</TableHead>
                          <TableHead>Published</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.data.internalMarks.map((m) => (
                          <TableRow key={m.subjectId}>
                            <TableCell>{m.subjectName}</TableCell>
                            <TableCell>{m.marks}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium">External marks</h3>
                  {profile.data.externalMarks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No approved external marks yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Approved</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.data.externalMarks.map((m) => (
                          <TableRow key={m.subjectId}>
                            <TableCell>{m.subjectName}</TableCell>
                            <TableCell>{m.grade}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {m.approvedAt ? new Date(m.approvedAt).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
