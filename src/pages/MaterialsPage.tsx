import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { uploadMaterialFile, listMyGroups, type MaterialDto } from '@/lib/api'
import { useActiveSection } from '@/lib/activeSection'
import { useTaughtSubjects } from '@/lib/useTaughtSubjects'
import { reportApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const ACCEPTED_TYPES =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.mp4,.zip'
const ACCEPTED_TYPES_LABEL = 'PDF, Word, PowerPoint, Excel, text, PNG/JPEG, MP4, or ZIP'

// TWA-06 — real file upload (replacing the old "paste a URL" form), attached to a subject
// (filtered by the active section), a group, or both. Posting to a group also surfaces it
// in that group's Materials section automatically (SDA-16).
export function MaterialsPage() {
  const { sectionId, sectionName, assignedSections, isLoading: sectionLoading } = useActiveSection()
  const subjects = useTaughtSubjects(sectionId)
  const groupsQuery = useQuery({ queryKey: ['groups', 'mine'], queryFn: listMyGroups })

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: () =>
      uploadMaterialFile(
        { title, subjectId: subjectId || null, groupId: groupId || null, file: file! },
        setProgress,
      ),
    onSuccess: (material: MaterialDto) => {
      toast.success(`"${material.title}" uploaded.`)
      setTitle('')
      setSubjectId('')
      setGroupId('')
      setFile(null)
      setProgress(null)
    },
    onError: (err) => {
      reportApiError(err, 'Failed to upload material.')
      setProgress(null)
    },
  })

  const handleFileChosen = (chosen: File | null) => {
    if (!chosen) return
    if (chosen.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`"${chosen.name}" exceeds the 25 MB upload limit.`)
      return
    }
    setFile(chosen)
  }

  const canSubmit =
    Boolean(title.trim() && file && (subjectId || groupId)) && !uploadMutation.isPending

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload material</CardTitle>
          <CardDescription>TWA-06 — attach to a subject, a group, or both.</CardDescription>
        </CardHeader>
        <CardContent>
          {sectionLoading && <Skeleton className="h-9 w-full" />}
          {!sectionLoading && assignedSections.length === 0 && (
            <Alert>
              <AlertTitle>No sections scheduled yet</AlertTitle>
              <AlertDescription>Ask Admin to publish your timetable before uploading materials.</AlertDescription>
            </Alert>
          )}
          {!sectionLoading && assignedSections.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                uploadMutation.mutate()
              }}
              className="flex flex-col gap-3"
            >
              <Label className="text-muted-foreground">Section</Label>
              <p className="text-sm">
                {sectionId ? sectionName : 'No section selected'}{' '}
                <span className="text-xs text-muted-foreground">
                  — switch classes using the "Section:" selector in the top nav; this narrows the subject list below
                </span>
              </p>

              <Label className="text-muted-foreground">Title</Label>
              <Input placeholder="Material title" value={title} onChange={(e) => setTitle(e.target.value)} />

              <div
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors',
                  isDragOver ? 'border-primary bg-accent' : 'border-border',
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  handleFileChosen(e.dataTransfer.files[0] ?? null)
                }}
              >
                <UploadCloud className="size-6 text-muted-foreground" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Drag a file here, or click to browse</p>
                )}
                <p className="text-xs text-muted-foreground">{ACCEPTED_TYPES_LABEL} — up to 25 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
                />
              </div>

              {progress !== null && <Progress value={progress} />}

              <Label className="text-muted-foreground">Subject (optional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!sectionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={sectionId ? 'Select a subject…' : 'Select a section first'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label className="text-muted-foreground">Group (optional)</Label>
              <Select value={groupId} onValueChange={setGroupId} disabled={groupsQuery.isLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a group…" />
                </SelectTrigger>
                <SelectContent>
                  {(groupsQuery.data?.groups ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">At least one of subject or group is required.</p>

              <Button type="submit" disabled={!canSubmit}>
                {uploadMutation.isPending ? 'Uploading…' : 'Upload material'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
