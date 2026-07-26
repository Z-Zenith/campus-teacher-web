// Core HTTP client, auth, timetable, events, and reports are genuinely shared
// with apps/admin-web (and, for the HTTP client only, apps/parent-portal) —
// see packages/api-client (issue #87). Everything below stays app-local
// because it's TWA-specific (attendance, marks, roster, feedback, DMS adapters).
export {
  getToken,
  setToken,
  ApiError,
  login,
  getMyTimetable,
  generateTimetable,
  patchTimetableSlot,
  createChangeRequest,
  createEvent,
  createReport,
} from '@campus/api-client'
export type {
  LoginResponse,
  TimetableSlotDto,
  ChangeRequestDto,
  EventDto,
  TeacherReportDto,
} from '@campus/api-client'

import { request, ApiError, getToken } from '@campus/api-client'
import { extractOutgoingLinks, type SekError } from '@campus/shared-editor-kit'

export interface RosterStudentDto {
  studentId: string
  fullName: string
}

export function getSectionRoster(timetableSlotId: string) {
  return request<RosterStudentDto[]>(`/timetable/slots/${timetableSlotId}/roster`)
}

// Sourced from TeacherSectionAssignments (the same table GetSectionPerformanceSummary and
// MarksController.InternalRoster authorize against), not from TimetableSlots — this is the
// fix for Dashboard's false-403: a section can appear in a teacher's timetable via a manually
// patched slot with no corresponding TeacherSectionAssignment.
export interface AssignedSectionDto {
  sectionId: string
  sectionName: string
}

export function getMySections() {
  return request<AssignedSectionDto[]>('/timetable/sections/mine')
}

// Roster scoped by section (not by a single timetable slot, unlike getSectionRoster above) —
// used by Reports' student picker, Marks' section-scoped roster, and Assignments' Submissions
// tab. `identifier` is the student's roll number (also their login username).
export interface SectionRosterStudentDto {
  studentId: string
  fullName: string
  identifier: string
}

export function getStudentsInSection(sectionId: string) {
  return request<SectionRosterStudentDto[]>(`/timetable/sections/${sectionId}/roster`)
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late'

export interface MarkedAttendanceDto {
  studentId: string
  studentName: string
  status: string
}

export interface MarkAttendanceResponse {
  classSessionId: string
  sessionDate: string
  sectionId: string
  records: MarkedAttendanceDto[]
}

export interface AttendanceAlertDto {
  studentId: string
  studentName: string
  sectionId: string
  sectionName: string
  attendancePercentage: number
}

export function getAttendanceAlerts() {
  return request<AttendanceAlertDto[]>('/attendance/alerts')
}

export function markAttendance(
  timetableSlotId: string,
  entries: { studentId: string; status: AttendanceStatus }[],
  sessionDate?: string,
) {
  return request<MarkAttendanceResponse>('/attendance', {
    method: 'POST',
    body: JSON.stringify({ timetableSlotId, sessionDate: sessionDate ?? null, entries }),
  })
}

export interface SectionFeedbackDto {
  id: string
  sectionId: string
  sectionName: string
  rating: number
  comments: string | null
  submittedAt: string
}

export function submitSectionFeedback(sectionId: string, rating: number, comments?: string) {
  return request<SectionFeedbackDto>(`/timetable/sections/${sectionId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comments: comments ?? null }),
  })
}

export interface StudentAttendanceDto {
  studentId: string
  studentName: string
  attendancePercentage: number | null
}

export interface SubjectMarksSummaryDto {
  subjectId: string
  subjectName: string
  averageMarks: number | null
  studentsGraded: number
}

export interface SectionPerformanceSummaryDto {
  sectionId: string
  sectionName: string
  overallAttendancePercentage: number | null
  studentAttendance: StudentAttendanceDto[]
  marksBySubject: SubjectMarksSummaryDto[]
}

export function getSectionPerformanceSummary(sectionId: string) {
  return request<SectionPerformanceSummaryDto>(`/timetable/sections/${sectionId}/performance-summary`)
}

export interface ExternalMarksPermissionStatus {
  granted: boolean
  expiresAt: string | null
}

export function getExternalMarksPermissionStatus() {
  return request<ExternalMarksPermissionStatus>('/marks/external/permission-status')
}

export interface ExternalMarkSubmission {
  id: string
  studentId: string
  subjectId: string
  grade: string
  status: string
  submittedAt: string
}

export function submitExternalMark(mark: { studentId: string; subjectId: string; grade: string }) {
  return request<ExternalMarkSubmission>('/marks/external', {
    method: 'POST',
    body: JSON.stringify(mark),
  })
}

// TWA-20
export interface PendingExternalMarkDto {
  id: string
  studentId: string
  studentFullName: string
  subjectId: string
  subjectName: string
  grade: string
  submittedBy: string
  submittedByFullName: string
  submittedAt: string
}

export function getPendingExternalMarks() {
  return request<PendingExternalMarkDto[]>('/marks/external/pending')
}

export interface ApproveExternalMarkResponse {
  id: string
  approvedBy: string
  approvedAt: string
}

export function approveExternalMark(id: string) {
  return request<ApproveExternalMarkResponse>(`/marks/external/${id}/approve`, {
    method: 'POST',
  })
}

export interface InternalMarksRosterEntry {
  studentId: string
  studentName: string
  marks: number | null
  published: boolean
  publishedAt: string | null
}

export function getInternalMarksRoster(subjectId: string, assignmentId?: string, sectionId?: string) {
  const params = new URLSearchParams({ subjectId })
  if (assignmentId) params.set('assignmentId', assignmentId)
  if (sectionId) params.set('sectionId', sectionId)
  return request<InternalMarksRosterEntry[]>(`/marks/internal/roster?${params.toString()}`)
}

export interface InternalMarkRecord {
  id: string
  studentId: string
  subjectId: string
  assignmentId: string | null
  marks: number
  published: boolean
  publishedAt: string | null
}

export function submitInternalMark(mark: {
  studentId: string
  subjectId: string
  assignmentId?: string | null
  marks: number
  publish?: boolean
}) {
  return request<InternalMarkRecord>('/marks/internal', {
    method: 'POST',
    body: JSON.stringify({
      studentId: mark.studentId,
      subjectId: mark.subjectId,
      assignmentId: mark.assignmentId ?? null,
      marks: mark.marks,
      publish: mark.publish ?? false,
    }),
  })
}

// TWA-07 — assignment creation. Backend: AssignmentsController.Create (already on main).
export type AssignmentType = 'Code' | 'Quiz' | 'Essay' | 'FileUpload'

export interface AssignmentDto {
  id: string
  subjectId: string
  title: string
  description: string | null
  type: string
  dueDate: string
  submissionWindowStart: string
  submissionWindowEnd: string
  typeSpecificSettings: string | null
}

export function createAssignment(assignment: {
  subjectId: string
  title: string
  description: string | null
  type: AssignmentType
  dueDate: string
  submissionWindowStart: string
  submissionWindowEnd: string
  typeSpecificSettings?: string | null
}) {
  return request<AssignmentDto>('/assignments', {
    method: 'POST',
    body: JSON.stringify(assignment),
  })
}

// Backs the assignment list page — one row per assignment the teacher owns, with a
// submission count so the list doesn't need a follow-up request per row.
export interface AssignmentSummaryDto {
  id: string
  subjectId: string
  subjectName: string
  title: string
  type: string
  dueDate: string
  submissionCount: number
}

export function getMyAssignments() {
  return request<AssignmentSummaryDto[]>('/assignments/mine')
}

// Backs the Submissions tab — the roster cross-referenced against actual submission rows.
export interface AssignmentSubmissionStatusDto {
  studentId: string
  studentName: string
  status: 'Missing' | 'Late' | 'Submitted'
  submissionId: string | null
  submittedAt: string | null
  isAutosubmitted: boolean
}

export function getAssignmentSubmissions(assignmentId: string) {
  return request<AssignmentSubmissionStatusDto[]>(`/assignments/${assignmentId}/submissions`)
}

// TWA-06 — material upload. Backend: CommunityController.UploadMaterial (already on main).
export interface MaterialDto {
  id: string
  title: string
  fileUrl: string
  subjectId: string | null
  groupId: string | null
  uploadedBy: string
  uploadedAt: string
}

export function uploadMaterial(material: { title: string; fileUrl: string; subjectId: string | null; groupId: string | null }) {
  return request<MaterialDto>('/materials', {
    method: 'POST',
    body: JSON.stringify(material),
  })
}

// Real file upload (replacing the URL-paste flow above) — backend: CommunityController.
// UploadMaterialFile, streaming to Cloudflare R2. Uses XMLHttpRequest directly instead of the
// shared `request()` helper: fetch has no upload-progress event, and request() would also
// force a `Content-Type: application/json` header that must NOT be set on a FormData body —
// the browser needs to set its own `multipart/form-data; boundary=...` value.
export function uploadMaterialFile(
  material: { title: string; subjectId: string | null; groupId: string | null; file: File },
  onProgress?: (percent: number) => void,
) {
  return new Promise<MaterialDto>((resolve, reject) => {
    const formData = new FormData()
    formData.append('title', material.title)
    if (material.subjectId) formData.append('subjectId', material.subjectId)
    if (material.groupId) formData.append('groupId', material.groupId)
    formData.append('file', material.file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/v1/materials/upload')
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as MaterialDto)
        return
      }
      let message = xhr.statusText
      try {
        const parsed = JSON.parse(xhr.responseText)
        if (typeof parsed?.message === 'string' && parsed.message) message = parsed.message
      } catch {
        // response body wasn't JSON — fall back to statusText
      }
      reject(new ApiError(xhr.status, message))
    }
    xhr.onerror = () => reject(new ApiError(0, 'Network error during upload.'))

    xhr.send(formData)
  })
}

// TWA-05 — community groups: create a group, list the groups you belong to, and
// view/post within one. Backend: services/backend-api/Controllers/CommunityController.cs.
export type GroupType = 'SubjectSection' | 'Club' | 'TeacherOnly'

export interface GroupDto {
  id: string
  name: string
  type: string
  sectionId: string | null
}

export interface GroupPostDto {
  id: string
  groupId: string
  authorId: string
  content: string
  createdAt: string
}

export function createGroup(group: { name: string; type: GroupType; sectionId: string | null }) {
  return request<GroupDto>('/groups', {
    method: 'POST',
    body: JSON.stringify(group),
  })
}

export function listMyGroups() {
  return request<{ groups: GroupDto[] }>('/groups/mine')
}

export function listGroupPosts(groupId: string) {
  return request<GroupPostDto[]>(`/groups/${groupId}/posts`)
}

export function createGroupPost(groupId: string, content: string) {
  return request<GroupPostDto>(`/groups/${groupId}/posts`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

// DMS-01 / TWA-18 — thin adapters from the shared Direct Messaging package's
// embedder callbacks (Result<T, DmsError>) onto this app's fetch client
// (which throws ApiError). DMS owns no persistence or auth of its own; this
// is the only messaging logic that lives in teacher-web.
export interface ThreadSummaryDto {
  id: string
  studentId: string
  teacherId: string
  createdAt: string
  lastMessage: MessageDto | null
}

export interface MessageDto {
  id: string
  threadId: string
  senderId: string
  content: string
  sentAt: string
  readAt: string | null
}

function toDmsError(err: unknown): { code: 'unauthorized' | 'network_error'; message: string } {
  if (err instanceof ApiError) {
    return {
      code: err.status === 401 || err.status === 403 ? 'unauthorized' : 'network_error',
      message: err.message || 'Something went wrong.',
    }
  }
  return { code: 'network_error', message: 'Could not reach the server.' }
}

export async function dmsListThreads() {
  try {
    const threads = await request<ThreadSummaryDto[]>('/messages/threads')
    return { ok: true as const, value: threads }
  } catch (err) {
    return { ok: false as const, error: toDmsError(err) }
  }
}

export async function dmsListMessages(threadId: string) {
  try {
    const messages = await request<MessageDto[]>(`/messages/threads/${threadId}/messages`)
    return { ok: true as const, value: messages }
  } catch (err) {
    return { ok: false as const, error: toDmsError(err) }
  }
}

export async function dmsSendMessage(threadId: string, content: string) {
  try {
    const message = await request<MessageDto>(`/messages/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
    return { ok: true as const, value: message }
  } catch (err) {
    return { ok: false as const, error: toDmsError(err) }
  }
}

// TWA-14 — thin adapters from the Shared Editor Kit's NotesEditor (SEK-03) embedder
// callbacks (Result<T, SekError>) onto this app's fetch client. Same /notes/* endpoints
// SDA-08/SDA-19 already built for the Student Desktop App — Notes storage isn't
// SDA-specific, ownership is just scoped to whichever user is signed in.
export interface NoteSummaryDto {
  id: string
  title: string
  updatedAt: string
}

interface NoteDto {
  id: string
  title: string
  contentMarkdown: string
  createdAt: string
  updatedAt: string
}

interface NoteLinkInput {
  toNoteId: string
  anchor: string
}

function toSekError(err: unknown): SekError {
  if (err instanceof ApiError) {
    if (err.status === 404) return { code: 'note_not_found', message: 'Note not found.' }
    if (err.status === 403) return { code: 'unauthorized', message: "You don't have access to this note." }
    if (err.status === 400) return { code: 'validation_error', message: err.message || 'Invalid request.' }
    return { code: 'network_error', message: err.message || 'Something went wrong.' }
  }
  return { code: 'network_error', message: 'Could not reach the server.' }
}

// NoteDto has no ownerId (every note the API returns already belongs to the caller);
// SEK's Note type requires one, so it's synthesized from the signed-in user here —
// same approach SDA-19's SekBridge takes on the desktop side.
function toSekNote(dto: NoteDto, ownerId: string) {
  return { id: dto.id, ownerId, title: dto.title, contentMarkdown: dto.contentMarkdown, createdAt: dto.createdAt, updatedAt: dto.updatedAt }
}

export async function notesListMine() {
  try {
    return { ok: true as const, value: await request<NoteSummaryDto[]>('/notes/mine') }
  } catch (err) {
    return { ok: false as const, error: toSekError(err) }
  }
}

export async function notesGet(id: string, ownerId: string) {
  try {
    return { ok: true as const, value: toSekNote(await request<NoteDto>(`/notes/${id}`), ownerId) }
  } catch (err) {
    return { ok: false as const, error: toSekError(err) }
  }
}

// Upsert: SEK-03's NotesEditor always generates a note's Id client-side before its
// first save and expects one onSave callback, not a create/update split — try PATCH
// first, fall back to POST (with that Id) only if the note doesn't exist yet.
export async function notesSave(note: { id: string; ownerId: string; title: string; contentMarkdown: string }) {
  const links: NoteLinkInput[] = extractOutgoingLinks(note.contentMarkdown).map((link) => ({
    toNoteId: link.toNoteId,
    anchor: link.anchor,
  }))
  try {
    const dto = await request<NoteDto>(`/notes/${note.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: note.title, contentMarkdown: note.contentMarkdown, links }),
    })
    return { ok: true as const, value: toSekNote(dto, note.ownerId) }
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) {
      return { ok: false as const, error: toSekError(err) }
    }
    try {
      const dto = await request<NoteDto>('/notes', {
        method: 'POST',
        body: JSON.stringify({ title: note.title, contentMarkdown: note.contentMarkdown, id: note.id, links }),
      })
      return { ok: true as const, value: toSekNote(dto, note.ownerId) }
    } catch (err2) {
      return { ok: false as const, error: toSekError(err2) }
    }
  }
}

export async function notesDelete(id: string) {
  try {
    await request<void>(`/notes/${id}`, { method: 'DELETE' })
    return { ok: true as const, value: undefined }
  } catch (err) {
    return { ok: false as const, error: toSekError(err) }
  }
}

export async function notesBacklinks(id: string, ownerId: string) {
  try {
    const dtos = await request<NoteDto[]>(`/notes/${id}/backlinks`)
    return { ok: true as const, value: dtos.map((dto) => toSekNote(dto, ownerId)) }
  } catch (err) {
    return { ok: false as const, error: toSekError(err) }
  }
}
