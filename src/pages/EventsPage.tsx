import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { createEvent, getMyEvents } from '@/lib/api'
import { reportApiError } from '@/lib/errors'

// A college program can run more than the typical 4 undergraduate years (integrated/
// professional programs) — 1 through 5 covers that without needing a dedicated backend
// lookup just for this one multi-select.
const AVAILABLE_YEARS = [1, 2, 3, 4, 5]

export function EventsPage() {
  const queryClient = useQueryClient()
  const eventsQuery = useQuery({ queryKey: ['events', 'mine'], queryFn: getMyEvents })

  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [restrictedYears, setRestrictedYears] = useState<number[]>([])

  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      toast.success('Event published — eligible students can now register (SDA-20).')
      queryClient.invalidateQueries({ queryKey: ['events', 'mine'] })
      setTitle('')
      setStartTime('')
      setEndTime('')
      setRestrictedYears([])
    },
    onError: (err) => reportApiError(err, 'Failed to create event.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createEventMutation.mutate({
      title,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      restrictedYears: restrictedYears.length ? restrictedYears : null,
      restrictedDepartments: null,
    })
  }

  const toggleYear = (year: number) =>
    setRestrictedYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]))

  const now = Date.now()
  const upcoming = (eventsQuery.data ?? []).filter((e) => new Date(e.endTime).getTime() >= now)
  const past = (eventsQuery.data ?? []).filter((e) => new Date(e.endTime).getTime() < now)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Create an event</CardTitle>
          <CardDescription>
            Optionally restrict to specific years — leave unchecked for everyone (TWA-15).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Label className="text-muted-foreground">Title</Label>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

            <Label className="text-muted-foreground">Start time</Label>
            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />

            <Label className="text-muted-foreground">End time</Label>
            <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />

            <Label className="text-muted-foreground">Restrict to years (optional)</Label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_YEARS.map((year) => (
                <label key={year} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border"
                    checked={restrictedYears.includes(year)}
                    onChange={() => toggleYear(year)}
                  />
                  Year {year}
                </label>
              ))}
            </div>

            <Button type="submit" disabled={!title || !startTime || !endTime || createEventMutation.isPending}>
              Publish event
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your events</CardTitle>
          <CardDescription>Every event in your college — upcoming first, then past.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {eventsQuery.isLoading && <Skeleton className="h-32 w-full" />}
          {eventsQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
          {eventsQuery.data && eventsQuery.data.length > 0 && (
            <>
              {upcoming.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Upcoming</h3>
                  <EventsTable events={upcoming} />
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">Past</h3>
                  <EventsTable events={past} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EventsTable({ events }: { events: { id: string; title: string; startTime: string; endTime: string }[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Starts</TableHead>
          <TableHead>Ends</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id}>
            <TableCell>{e.title}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(e.startTime).toLocaleString()}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(e.endTime).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
