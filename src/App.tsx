import { Navigate, Route, Routes, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ActiveSectionProvider, useActiveSection } from '@/lib/activeSection'
import { LoginPage } from '@/pages/LoginPage'
import { TimetablePage } from '@/pages/TimetablePage'
import { EventsPage } from '@/pages/EventsPage'
import { ApproveMarksPage } from '@/pages/ApproveMarksPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ExternalMarksPage } from '@/pages/ExternalMarksPage'
import { AttendancePage } from '@/pages/AttendancePage'
import { MarksPage } from '@/pages/MarksPage'
import { MessagesPage } from '@/pages/MessagesPage'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { AssignmentDetailPage } from '@/pages/AssignmentDetailPage'
import { StudentPerformancePage } from '@/pages/StudentPerformancePage'
import { MaterialsPage } from '@/pages/MaterialsPage'
import { CommunityPage } from '@/pages/CommunityPage'
import { NotesPage } from '@/pages/NotesPage'
import { DashboardPage } from '@/pages/DashboardPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

// TWA-02: global section switcher — lets the teacher pick any assigned section, taking
// precedence over TWA-01's auto-computed one, and reverts on "Auto" so consumers of
// useActiveSection() (dashboard/attendance/materials) update immediately either way.
function SectionSwitcher() {
  const { sectionId, sectionName, isManualOverride, assignedSections, selectSection, clearManualSelection } =
    useActiveSection()

  if (assignedSections.length === 0) return null

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-muted-foreground">Section:</label>
      <select
        className="rounded-md border px-2 py-1 text-sm"
        value={sectionId ?? ''}
        onChange={(e) => (e.target.value ? selectSection(e.target.value) : clearManualSelection())}
      >
        <option value="">— none —</option>
        {assignedSections.map((section) => (
          <option key={section.sectionId} value={section.sectionId}>
            {section.sectionName}
          </option>
        ))}
      </select>
      {isManualOverride && (
        <button onClick={clearManualSelection} className="underline">
          Auto ({sectionName ? 'switch back' : 'clear'})
        </button>
      )}
    </div>
  )
}

// Groups mirror the architecture doc's Section 8b component clusters (Auth/Dashboard,
// Attendance & Marks, Materials & Assignments, Community, Calendar & Events, Ops & Feedback)
// instead of inventing new IA — this replaces the previous flat list of 13 ungrouped links.
const NAV_GROUPS: { label: string; links: { to: string; label: string }[] }[] = [
  {
    label: 'Schedule',
    links: [
      { to: '/timetable', label: 'Timetable' },
      { to: '/attendance', label: 'Attendance' },
      { to: '/events', label: 'Events' },
    ],
  },
  {
    label: 'Academics',
    links: [
      { to: '/marks', label: 'Marks' },
      { to: '/external-marks', label: 'External Marks' },
      { to: '/approve-marks', label: 'Approve Marks' },
      { to: '/assignments', label: 'Assignments' },
    ],
  },
  {
    label: 'Students',
    links: [
      { to: '/reports', label: 'Report' },
      { to: '/students/performance', label: 'Performance' },
    ],
  },
  {
    label: 'Community',
    links: [
      { to: '/community', label: 'Community' },
      { to: '/materials', label: 'Materials' },
    ],
  },
  {
    label: 'Messaging',
    links: [
      { to: '/messages', label: 'Messages' },
      { to: '/notes', label: 'Notes' },
    ],
  },
]

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'text-foreground' : 'text-muted-foreground transition-colors hover:text-foreground'
}

function Shell({ children }: { children: React.ReactNode }) {
  const { fullName, setSession } = useAuth()
  return (
    <div className="min-h-svh">
      <nav className="flex flex-wrap items-center justify-between gap-y-2 border-b px-8 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
          <NavLink to="/dashboard" className={navLinkClassName}>
            Dashboard
          </NavLink>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-4 border-l pl-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                {group.label}
              </span>
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClassName}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SectionSwitcher />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{fullName}</span>
            <button onClick={() => setSession(null)} className="underline">
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ActiveSectionProvider>
        <Toaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Shell>
                  <DashboardPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/timetable"
            element={
              <RequireAuth>
                <Shell>
                  <TimetablePage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/attendance"
            element={
              <RequireAuth>
                <Shell>
                  <AttendancePage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/events"
            element={
              <RequireAuth>
                <Shell>
                  <EventsPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <Shell>
                  <ReportsPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/students/performance"
            element={
              <RequireAuth>
                <Shell>
                  <StudentPerformancePage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/external-marks"
            element={
              <RequireAuth>
                <Shell>
                  <ExternalMarksPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/marks"
            element={
              <RequireAuth>
                <Shell>
                  <MarksPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/approve-marks"
            element={
              <RequireAuth>
                <Shell>
                  <ApproveMarksPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/messages"
            element={
              <RequireAuth>
                <Shell>
                  <MessagesPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/assignments"
            element={
              <RequireAuth>
                <Shell>
                  <AssignmentsPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/assignments/:id"
            element={
              <RequireAuth>
                <Shell>
                  <AssignmentDetailPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/materials"
            element={
              <RequireAuth>
                <Shell>
                  <MaterialsPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/community"
            element={
              <RequireAuth>
                <Shell>
                  <CommunityPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/notes"
            element={
              <RequireAuth>
                <Shell>
                  <NotesPage />
                </Shell>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/timetable" replace />} />
        </Routes>
      </ActiveSectionProvider>
    </AuthProvider>
  )
}

export default App
