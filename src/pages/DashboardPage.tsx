import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSectionPerformanceSummary, ApiError } from '@/lib/api'
import { useActiveSection } from '@/lib/activeSection'

// Re-fetched on this interval so the dashboard reflects marks/attendance no older than
// the last sync, without requiring a manual page reload (TWA-04 AC).
const REFRESH_INTERVAL_MS = 30_000

export function DashboardPage() {
  const {
    sectionId: autoSectionId,
    assignedSections,
    isLoading: sectionsLoading,
  } = useActiveSection()
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  // Defaults to the teacher's currently-scheduled section (TWA-01) once assignedSections
  // arrives, but the teacher can still pick a different taught section from the dropdown.
  // assignedSections is sourced from TeacherSectionAssignments (via useActiveSection), the
  // same table the performance-summary endpoint authorizes against — this is what fixes the
  // false-403 that could happen when the section list was derived from TimetableSlots instead.
  useEffect(() => {
    if (!selectedSectionId && (autoSectionId || assignedSections.length > 0)) {
      setSelectedSectionId(autoSectionId ?? assignedSections[0].sectionId)
    }
  }, [autoSectionId, assignedSections, selectedSectionId])

  const summary = useQuery({
    queryKey: ['timetable', 'sections', selectedSectionId, 'performance-summary'],
    queryFn: () => getSectionPerformanceSummary(selectedSectionId!),
    enabled: !!selectedSectionId,
    refetchInterval: REFRESH_INTERVAL_MS,
  })

  const selectedSectionName = assignedSections.find((s) => s.sectionId === selectedSectionId)?.sectionName

  const marksChartData = (summary.data?.marksBySubject ?? []).map((s) => ({
    name: s.subjectName,
    averageMarks: s.averageMarks ?? 0,
  }))

  const attendanceChartData = (summary.data?.studentAttendance ?? []).map((s) => ({
    name: s.studentName,
    attendance: s.attendancePercentage ?? 0,
  }))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Class performance dashboard</CardTitle>
          <CardDescription>Attendance and marks for the selected section (TWA-04).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sectionsLoading && <Skeleton className="h-9 w-48" />}

          {!sectionsLoading && assignedSections.length === 0 && (
            <Alert>
              <AlertTitle>No sections scheduled yet</AlertTitle>
              <AlertDescription>Ask Admin to publish your timetable — the dashboard will populate once a section is assigned.</AlertDescription>
            </Alert>
          )}

          {!sectionsLoading && assignedSections.length > 0 && (
            <Select value={selectedSectionId ?? ''} onValueChange={setSelectedSectionId}>
              <SelectTrigger className="w-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignedSections.map((section) => (
                  <SelectItem key={section.sectionId} value={section.sectionId}>
                    {section.sectionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {summary.isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-6 w-48" />
            </div>
          )}

          {summary.isError && (
            <Alert variant="destructive">
              {summary.error instanceof ApiError && summary.error.status === 403 ? (
                <>
                  <AlertTitle>Assignment mismatch</AlertTitle>
                  <AlertDescription>
                    You're scheduled to teach {selectedSectionName ?? 'this section'} but aren't recorded as an
                    assigned teacher for it — ask Admin to reconcile the assignment.
                  </AlertDescription>
                </>
              ) : (
                <AlertDescription>Could not load performance summary.</AlertDescription>
              )}
            </Alert>
          )}

          {summary.data && (
            <p className="text-sm text-muted-foreground">
              Overall attendance:{' '}
              <span className="font-medium text-foreground">
                {summary.data.overallAttendancePercentage === null ? 'No data yet' : `${summary.data.overallAttendancePercentage}%`}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {summary.data && summary.data.studentAttendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance by student</CardTitle>
          </CardHeader>
          <CardContent style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="attendance" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {summary.data && summary.data.marksBySubject.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average marks by subject</CardTitle>
          </CardHeader>
          <CardContent style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={marksChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="averageMarks" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
