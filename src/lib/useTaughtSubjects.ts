import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyTimetable } from './api'

export interface TaughtSubject {
  subjectId: string
  subjectName: string
}

/**
 * Subjects the teacher teaches, optionally scoped to a single section. Reuses the shared
 * ['timetable', 'mine'] query cache (also used by useActiveSection/TimetablePage/MarksPage) —
 * no extra fetch. Pass a sectionId (from useActiveSection()) to filter to only the subjects
 * taught in that section; omit it to list every subject taught anywhere.
 */
export function useTaughtSubjects(sectionId?: string | null): TaughtSubject[] {
  const timetable = useQuery({ queryKey: ['timetable', 'mine'], queryFn: getMyTimetable })

  return useMemo(() => {
    const bySubject = new Map<string, string>()
    for (const slot of timetable.data ?? []) {
      if (sectionId && slot.sectionId !== sectionId) continue
      bySubject.set(slot.subjectId, slot.subjectName)
    }
    return Array.from(bySubject, ([subjectId, subjectName]) => ({ subjectId, subjectName }))
  }, [timetable.data, sectionId])
}
