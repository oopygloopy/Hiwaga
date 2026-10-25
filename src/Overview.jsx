import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import DataTable from './DataTable.jsx'
import hiwagaLogo from './assets/hiwagalogo.png'

const PlayCount = lazy(() => import('./charts/playcount.jsx'))
const Records = lazy(() => import('./Records.jsx'))
const Students = lazy(() => import('./Students.jsx'))
const Teachers = lazy(() => import('./Teachers.jsx'))
const Questions = lazy(() => import('./Questions.jsx'))
const Leaderboard = lazy(() => import('./Leaderboard.jsx'))

const dashboardViews = ['overview', 'leaderboard', 'records', 'questions', 'students', 'teachers']
const activeViewStorageKey = 'hiwaga-dashboard-active-view'

const getProfileUuid = (profile) => profile.uuid ?? profile.user_id ?? profile.id

const getProfileLabel = (profile) => (
  [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ') || String(getProfileUuid(profile))
)

const compareRecordsByTime = (firstRecord, secondRecord, direction = -1) => {
  const firstValue = firstRecord.Time
  const secondValue = secondRecord.Time

  if (firstValue === null || firstValue === undefined) return 1
  if (secondValue === null || secondValue === undefined) return -1

  const firstDate = Date.parse(firstRecord.Date)
  const secondDate = Date.parse(secondRecord.Date)

  if (Number.isFinite(firstDate) && Number.isFinite(secondDate) && firstDate !== secondDate) {
    return (firstDate - secondDate) * direction
  }

  const firstTime = Date.parse(firstValue)
  const secondTime = Date.parse(secondValue)

  if (Number.isFinite(firstTime) && Number.isFinite(secondTime)) {
    return (firstTime - secondTime) * direction
  }

  const firstNumber = Number(firstValue)
  const secondNumber = Number(secondValue)

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return (firstNumber - secondNumber) * direction
  }

  return String(firstValue).localeCompare(String(secondValue)) * direction
}

function Overview({ user }) {
  const [activeView, setActiveView] = useState(() => {
    const savedView = window.localStorage.getItem(activeViewStorageKey)
    return savedView === 'users' ? 'students' : savedView === 'teachers' ? 'overview' : dashboardViews.includes(savedView) ? savedView : 'overview'
  })
  const [isSignOutOpen, setIsSignOutOpen] = useState(false)
  const [records, setRecords] = useState([])
  const [isRecordsLoading, setIsRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState('')
  const [recentActivityRecords, setRecentActivityRecords] = useState([])
  const [isRecentActivityLoading, setIsRecentActivityLoading] = useState(true)
  const [recentActivityError, setRecentActivityError] = useState('')
  const [students, setStudents] = useState([])
  const [teacherProfiles, setTeacherProfiles] = useState([])
  const [teacherAccountProfiles, setTeacherAccountProfiles] = useState([])
  const [isTeachersLoading, setIsTeachersLoading] = useState(false)
  const [teachersError, setTeachersError] = useState('')
  const [profileRole, setProfileRole] = useState('')
  const [profiles, setProfiles] = useState([])
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [studentsRefreshKey, setStudentsRefreshKey] = useState(0)
  const [isStudentsLoading, setIsStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)
  const [createStudentError, setCreateStudentError] = useState('')
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false)
  const [selectedProfileUuid, setSelectedProfileUuid] = useState('')
  const [editStudentFields, setEditStudentFields] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    section: '',
  })
  const [isUpdatingStudent, setIsUpdatingStudent] = useState(false)
  const [updateStudentError, setUpdateStudentError] = useState('')
  const [isDeleteStudentOpen, setIsDeleteStudentOpen] = useState(false)
  const [selectedDeleteProfileUuid, setSelectedDeleteProfileUuid] = useState('')
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false)
  const [isDeletingStudent, setIsDeletingStudent] = useState(false)
  const [deleteStudentError, setDeleteStudentError] = useState('')
  const [newStudent, setNewStudent] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    section: '',
  })
  const [overviewStats, setOverviewStats] = useState({ studentCount: null, averageGrade: null, totalQuestionsAnswered: null, totalRecords: null })
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [studentAverages, setStudentAverages] = useState([])
  const [sort, setSort] = useState({ column: 'Time', direction: -1 })
  const [scoreXAxis, setScoreXAxis] = useState('finished_at')

  useEffect(() => {
    window.localStorage.setItem(activeViewStorageKey, activeView)
  }, [activeView])

  useEffect(() => {
    let isMounted = true

    const loadProfileRole = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('uuid', user.id)
        .maybeSingle()

      if (!isMounted) return

      const role = String(data?.role ?? '').trim().toLowerCase()
      setProfileRole(error ? '' : role)
    }

    if (user?.id) loadProfileRole()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  useEffect(() => {
    let isMounted = true

    const loadOverviewStats = async () => {
      const [profileCountResult, averageResult] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        (async () => {
          let total = 0
          let count = 0
          let totalQuestionsAnswered = 0
          let totalRecords = 0
          const students = new Map()
          const pageSize = 1000

          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabase
              .from('records')
              .select('corr_percent, total_question, user, profile:profiles!user(first_name, last_name)')
              .range(offset, offset + pageSize - 1)

            if (error) return { average: null, totalQuestionsAnswered: null, students: [], error: error.message }

            totalRecords += (data ?? []).length

            for (const record of data ?? []) {
              const value = Number(record.corr_percent)
              if (record.corr_percent !== null && Number.isFinite(value)) {
                total += value
                count += 1

                const userId = record.user === null || record.user === undefined ? '' : String(record.user)
                if (userId) {
                  const student = students.get(userId) ?? {
                    name: [record.profile?.first_name, record.profile?.last_name].filter(Boolean).join(' ') || userId,
                    total: 0,
                    count: 0,
                  }
                  student.total += value
                  student.count += 1
                  students.set(userId, student)
                }
              }

              const questions = Number(record.total_question)
              if (record.total_question !== null && Number.isFinite(questions)) {
                totalQuestionsAnswered += questions
              }
            }

            if ((data ?? []).length < pageSize) break
          }

          return {
            average: count ? total / count : null,
            totalQuestionsAnswered,
            totalRecords,
            students: Array.from(students, ([id, student]) => ({
              id,
              name: student.name,
              average: student.total / student.count,
            })).sort((first, second) => first.name.localeCompare(second.name)),
            error: '',
          }
        })(),
      ])

      if (!isMounted) return

      setOverviewStats({
        studentCount: profileCountResult.count,
        averageGrade: averageResult.average,
        totalQuestionsAnswered: averageResult.totalQuestionsAnswered,
        totalRecords: averageResult.totalRecords,
      })
      setStudentAverages(averageResult.students)
      setOverviewError([profileCountResult.error?.message, averageResult.error].filter(Boolean).join('; '))
      setIsOverviewLoading(false)
    }

    loadOverviewStats()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (activeView !== 'records') return undefined

    let isMounted = true

    const loadRecords = async () => {
      setIsRecordsLoading(true)
      setRecordsError('')
      const { data, error } = await supabase.from('record_view').select('*')

      if (!isMounted) {
        return
      }

      if (error) {
        setRecordsError(error.message)
      } else {
        setRecords(data ?? [])
      }

      setIsRecordsLoading(false)
    }

    loadRecords()

    return () => {
      isMounted = false
    }
  }, [activeView])

  useEffect(() => {
    if (activeView !== 'overview') return undefined

    let isMounted = true

    const loadRecentActivity = async () => {
      setIsRecentActivityLoading(true)
      setRecentActivityError('')
      const { data, error } = await supabase.from('record_view').select('*')

      if (!isMounted) return

      if (error) {
        setRecentActivityError(error.message)
      } else {
        setRecentActivityRecords([...data ?? []].sort(compareRecordsByTime).slice(0, 5))
      }

      setIsRecentActivityLoading(false)
    }

    loadRecentActivity()

    return () => {
      isMounted = false
    }
  }, [activeView])

  useEffect(() => {
    if (activeView !== 'students') return undefined

    let isMounted = true

    const loadStudents = async () => {
      setIsStudentsLoading(true)
      setStudentsError('')

      try {
        const [studentsResult, sectionsResult, profilesResult] = await Promise.all([
          supabase.from('student_view').select('*'),
          supabase.from('sections').select('id, section_name'),
          supabase.from('profiles').select('*'),
        ])

        if (!isMounted) return

        const errors = [studentsResult.error?.message, sectionsResult.error?.message, profilesResult.error?.message].filter(Boolean)
        setStudentsError(errors.join('; '))
        setStudents(studentsResult.data ?? [])
        setProfiles((profilesResult.data ?? [])
          .filter((profile) => getProfileUuid(profile) !== null && getProfileUuid(profile) !== undefined)
          .sort((first, second) => getProfileLabel(first).localeCompare(getProfileLabel(second))))
        setSections((sectionsResult.data ?? [])
          .filter(({ id, section_name }) => id !== null && id !== undefined && section_name !== null && String(section_name).trim() !== '')
          .sort((first, second) => String(first.section_name).localeCompare(String(second.section_name))))
      } catch (error) {
        if (!isMounted) return
        setStudentsError(error?.message || 'Unable to load students.')
        setStudents([])
        setProfiles([])
        setSections([])
      } finally {
        if (isMounted) {
          setIsStudentsLoading(false)
        }
      }
    }

    loadStudents()

    return () => {
      isMounted = false
    }
  }, [activeView, studentsRefreshKey])

  useEffect(() => {
    if (activeView !== 'teachers' || profileRole !== 'superadmin') return undefined

    let isMounted = true

    const loadTeachers = async () => {
      setIsTeachersLoading(true)
      setTeachersError('')

      try {
        const [teachersResult, sectionsResult, profilesResult] = await Promise.all([
          supabase.from('teacher_view').select('*'),
          supabase.from('sections').select('id, section_name'),
          supabase.from('profiles').select('uuid, first_name, middle_name, last_name, role'),
        ])

        if (!isMounted) return

        const errors = [teachersResult.error?.message, sectionsResult.error?.message, profilesResult.error?.message].filter(Boolean)
        setTeachersError(errors.join('; '))
        setTeacherProfiles(teachersResult.data ?? [])
        setTeacherAccountProfiles((profilesResult.data ?? [])
          .filter((profile) => String(profile.role ?? '').toLowerCase().includes('teacher') && profile.uuid)
          .sort((first, second) => getProfileLabel(first).localeCompare(getProfileLabel(second))))
        setSections((sectionsResult.data ?? [])
          .filter(({ id, section_name }) => id !== null && id !== undefined && section_name !== null && String(section_name).trim() !== '')
          .sort((first, second) => String(first.section_name).localeCompare(String(second.section_name))))
      } catch (error) {
        if (!isMounted) return
        setTeachersError(error?.message || 'Unable to load teachers.')
        setTeacherProfiles([])
        setTeacherAccountProfiles([])
        setSections([])
      } finally {
        if (isMounted) setIsTeachersLoading(false)
      }
    }

    loadTeachers()

    return () => {
      isMounted = false
    }
  }, [activeView, profileRole, studentsRefreshKey])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsSignOutOpen(false)
  }

  const handleCreateStudent = async (event) => {
    event.preventDefault()
    setCreateStudentError('')
    setIsCreatingStudent(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.access_token) throw new Error('Your session has expired. Sign in again to add a student.')

      const response = await fetch('https://iwobhagcimhndnyzppmf.supabase.co/functions/v1/teacher-create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...newStudent,
          section: Number(newStudent.section),
          ...(activeView === 'teachers' ? { role: 'teacher' } : {}),
        }),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(responseData?.message || responseData?.error || `Unable to add student (${response.status}).`)
      }

      setIsAddStudentOpen(false)
      setNewStudent({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
      setStudentsRefreshKey((currentKey) => currentKey + 1)
    } catch (error) {
      setCreateStudentError(error.message || 'Unable to add student.')
    } finally {
      setIsCreatingStudent(false)
    }
  }

  const handleUpdateStudent = async (event) => {
    event.preventDefault()
    setUpdateStudentError('')

    if (!selectedProfileUuid) {
      setUpdateStudentError('Select a student to edit.')
      return
    }

    const patch = { uuid: selectedProfileUuid }
    for (const field of ['email', 'password', 'last_name', 'first_name', 'middle_name']) {
      const value = editStudentFields[field].trim()
      if (value) patch[field] = value
    }
    if (editStudentFields.section !== '') {
      const sectionId = Number(editStudentFields.section)
      if (!Number.isInteger(sectionId)) {
        setUpdateStudentError('Select a valid section.')
        return
      }
      patch.section = sectionId
    }

    if (Object.keys(patch).length === 1) {
      setUpdateStudentError('Enter at least one field to update.')
      return
    }

    setIsUpdatingStudent(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.access_token) throw new Error('Your session has expired. Sign in again to edit a student.')

      const response = await fetch('https://iwobhagcimhndnyzppmf.supabase.co/functions/v1/teacher-create-user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(patch),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(responseData?.message || responseData?.error || `Unable to update student (${response.status}).`)
      }

      setIsEditStudentOpen(false)
      setSelectedProfileUuid('')
      setEditStudentFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
      setStudentsRefreshKey((currentKey) => currentKey + 1)
    } catch (error) {
      setUpdateStudentError(error.message || 'Unable to update student.')
    } finally {
      setIsUpdatingStudent(false)
    }
  }

  const handleDeleteStudent = async (event) => {
    event.preventDefault()
    setDeleteStudentError('')

    if (!selectedDeleteProfileUuid) {
      setDeleteStudentError('Select a student to delete.')
      return
    }
    if (!isDeleteConfirmed) {
      setDeleteStudentError('Confirm that you want to permanently delete this student.')
      return
    }

    setIsDeletingStudent(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.access_token) throw new Error('Your session has expired. Sign in again to delete a student.')

      const response = await fetch('https://iwobhagcimhndnyzppmf.supabase.co/functions/v1/teacher-create-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ uuid: selectedDeleteProfileUuid }),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(responseData?.message || responseData?.error || `Unable to delete student (${response.status}).`)
      }

      setIsDeleteStudentOpen(false)
      setSelectedDeleteProfileUuid('')
      setIsDeleteConfirmed(false)
      setStudentsRefreshKey((currentKey) => currentKey + 1)
    } catch (error) {
      setDeleteStudentError(error.message || 'Unable to delete student.')
    } finally {
      setIsDeletingStudent(false)
    }
  }

  const recordColumns = records.reduce((allColumns, record) => {
    Object.keys(record).forEach((column) => {
      if (!allColumns.includes(column)) allColumns.push(column)
    })
    return allColumns
  }, [])

  const sortedRecords = sort
    ? [...records].sort((firstRecord, secondRecord) => {
      const sortColumn = sort.column === 'alphabetical' ? recordColumns[0] : sort.column
      const firstValue = firstRecord[sortColumn]
      const secondValue = secondRecord[sortColumn]

      if (sortColumn === 'Time') {
        return compareRecordsByTime(firstRecord, secondRecord, sort.direction)
      }

      if (firstValue === null || firstValue === undefined) return 1
      if (secondValue === null || secondValue === undefined) return -1

      const firstNumber = sortColumn === 'Grade' ? Number.parseFloat(firstValue) : Number(firstValue)
      const secondNumber = sortColumn === 'Grade' ? Number.parseFloat(secondValue) : Number(secondValue)

      if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
        return (firstNumber - secondNumber) * sort.direction
      }

      return String(firstValue).localeCompare(String(secondValue)) * sort.direction
    })
    : records

  const filteredStudents = selectedSection
    ? students.filter((student) => String(student.Section ?? '') === selectedSection)
    : students

  const teacherRows = teacherProfiles
  const filteredTeachers = teacherRows

  const studentLists = [
    { title: 'Top Students', threshold: '>75', students: studentAverages.filter(({ average }) => average >= 75).sort((first, second) => second.average - first.average).slice(0, 5) },
    { title: 'Struggling Students', threshold: '>50', students: studentAverages.filter(({ average }) => average >= 50 && average < 75).sort((first, second) => second.average - first.average).slice(0, 5) },
    { title: 'Failing Students', threshold: '<50', students: studentAverages.filter(({ average }) => average >= 0 && average < 50).sort((first, second) => second.average - first.average).slice(0, 5) },
  ]

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <img className="dashboard-brand-logo" src={hiwagaLogo} alt="Hiwaga" />
          <nav className="dashboard-navigation" aria-label="Dashboard navigation">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'leaderboard', label: 'Leaderboard' },
              { id: 'records', label: 'Records' },
              { id: 'questions', label: 'Questions' },
              { id: 'students', label: 'Students' },
              ...(profileRole === 'superadmin' ? [{ id: 'teachers', label: 'Teachers' }] : []),
            ].map(({ id, label }) => (
              <button
                key={id}
                className="dashboard-navigation-link"
                type="button"
                aria-current={activeView === id ? 'page' : undefined}
                onClick={() => setActiveView(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <button className="sign-out-button" type="button" onClick={() => setIsSignOutOpen(true)}>
            Sign out
          </button>
        </aside>

        {isSignOutOpen && (
          <div
            className="add-user-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsSignOutOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsSignOutOpen(false)
            }}
          >
            <section className="sign-out-dialog" role="dialog" aria-modal="true" aria-labelledby="sign-out-title">
              <h2 id="sign-out-title">Sign out?</h2>
              <p>Are you sure you want to sign out?</p>
              <footer className="add-user-form-actions">
                <button type="button" onClick={() => setIsSignOutOpen(false)}>
                  Cancel
                </button>
                <button className="sign-out-confirm-button" type="button" onClick={handleSignOut}>
                  Sign out
                </button>
              </footer>
            </section>
          </div>
        )}

        <section className="dashboard-panel">
          <header className="dashboard-header">
            <h1>{activeView === 'overview' ? 'Overview' : activeView === 'leaderboard' ? 'Leaderboard' : activeView === 'records' ? 'Records' : activeView === 'students' ? 'Students' : activeView === 'teachers' ? 'Teachers' : 'Questions'}</h1>
          </header>

          <Suspense fallback={<p className="view-hint" role="status">Loading view...</p>}>
          {activeView === 'overview' && (
            <>
              <p className="view-hint">Shows summary of student activity, recent records, and play count within the past 14 days.</p>
              <section className="overview-stats" aria-label="Overview statistics">
                <div className="overview-stat">
                  <h2>Total Students</h2>
                  <p>{isOverviewLoading ? 'Loading...' : (overviewStats.studentCount ?? '-').toLocaleString()}</p>
                </div>
                <div className="overview-stat">
                  <h2>Total Questions Answered</h2>
                  <p>{isOverviewLoading
                    ? 'Loading...'
                    : (overviewStats.totalQuestionsAnswered ?? '-').toLocaleString()}</p>
                </div>
                <div className="overview-stat">
                  <h2>Total Records</h2>
                  <p>{isOverviewLoading
                    ? 'Loading...'
                    : (overviewStats.totalRecords ?? '-').toLocaleString()}</p>
                </div>
                <div className="overview-stat">
                  <h2>Avg. Grade</h2>
                  <p>{isOverviewLoading
                    ? 'Loading...'
                    : overviewStats.averageGrade === null
                      ? '-'
                      : `${overviewStats.averageGrade.toFixed(1)}`}</p>
                </div>
              </section>
              {overviewError && <p className="records-error" role="alert">Unable to load overview statistics: {overviewError}</p>}
              <section className="overview-activity-layout" aria-label="Play count and student scores">
                <div className="overview-activity-primary">
                  <PlayCount />
                  <section className="recent-activity" aria-labelledby="recent-activity-title">
                    <h2 id="recent-activity-title">Recent Activity</h2>
                    {isRecentActivityLoading && <p>Loading recent activity...</p>}
                    {recentActivityError && <p className="records-error" role="alert">Unable to load recent activity: {recentActivityError}</p>}
                    {!isRecentActivityLoading && !recentActivityError && recentActivityRecords.length === 0 && <p>No records found.</p>}
                    {!isRecentActivityLoading && !recentActivityError && recentActivityRecords.length > 0 && (
                      <DataTable
                        rows={recentActivityRecords}
                        columns={['Name', 'Grade', 'Time', 'Date']}
                      />
                    )}
                  </section>
                </div>
                <section className="student-score-lists" aria-label="Students by average score">
                  {studentLists.map(({ title, threshold, students }) => (
                    <section className="student-score-list" key={title}>
                      <h2>{title} <span className="student-score-threshold">{threshold}</span></h2>
                      {isOverviewLoading ? (
                        <p className="student-score-empty">Loading students...</p>
                      ) : students.length === 0 ? (
                        <p className="student-score-empty">No students</p>
                      ) : (
                        <ul>
                          {students.map(({ id, name, average }) => (
                            <li key={id}>
                              <span>{name}</span>
                              <strong>{average.toFixed(1)}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </section>
              </section>
            </>
          )}

          {activeView === 'records' && (
            <Records
              records={records}
              sort={sort}
              setSort={setSort}
              scoreXAxis={scoreXAxis}
              setScoreXAxis={setScoreXAxis}
              isRecordsLoading={isRecordsLoading}
              recordsError={recordsError}
              sortedRecords={sortedRecords}
            />
          )}

          {activeView === 'leaderboard' && <Leaderboard />}

          {activeView === 'questions' && <Questions />}

          {activeView === 'students' && (
            <Students
              students={students}
              filteredStudents={filteredStudents}
              sections={sections}
              selectedSection={selectedSection}
              setSelectedSection={setSelectedSection}
              isStudentsLoading={isStudentsLoading}
              studentsError={studentsError}
              profiles={profiles}
              newStudent={newStudent}
              setNewStudent={setNewStudent}
              isAddStudentOpen={isAddStudentOpen}
              setIsAddStudentOpen={setIsAddStudentOpen}
              isCreatingStudent={isCreatingStudent}
              createStudentError={createStudentError}
              setCreateStudentError={setCreateStudentError}
              handleCreateStudent={handleCreateStudent}
              isEditStudentOpen={isEditStudentOpen}
              setIsEditStudentOpen={setIsEditStudentOpen}
              selectedProfileUuid={selectedProfileUuid}
              setSelectedProfileUuid={setSelectedProfileUuid}
              editStudentFields={editStudentFields}
              setEditStudentFields={setEditStudentFields}
              isUpdatingStudent={isUpdatingStudent}
              updateStudentError={updateStudentError}
              setUpdateStudentError={setUpdateStudentError}
              handleUpdateStudent={handleUpdateStudent}
              isDeleteStudentOpen={isDeleteStudentOpen}
              setIsDeleteStudentOpen={setIsDeleteStudentOpen}
              selectedDeleteProfileUuid={selectedDeleteProfileUuid}
              setSelectedDeleteProfileUuid={setSelectedDeleteProfileUuid}
              isDeleteConfirmed={isDeleteConfirmed}
              setIsDeleteConfirmed={setIsDeleteConfirmed}
              isDeletingStudent={isDeletingStudent}
              deleteStudentError={deleteStudentError}
              setDeleteStudentError={setDeleteStudentError}
              handleDeleteStudent={handleDeleteStudent}
            />
          )}

          {activeView === 'teachers' && profileRole === 'superadmin' && (
            <Teachers
              users={teacherRows}
              filteredUsers={filteredTeachers}
              sections={sections}
              isUsersLoading={isTeachersLoading}
              usersError={teachersError}
              profiles={teacherAccountProfiles}
              newUser={newStudent}
              setNewUser={setNewStudent}
              isAddUserOpen={isAddStudentOpen}
              setIsAddUserOpen={setIsAddStudentOpen}
              isCreatingUser={isCreatingStudent}
              createUserError={createStudentError}
              setCreateUserError={setCreateStudentError}
              handleCreateUser={handleCreateStudent}
              isEditUserOpen={isEditStudentOpen}
              setIsEditUserOpen={setIsEditStudentOpen}
              selectedProfileUuid={selectedProfileUuid}
              setSelectedProfileUuid={setSelectedProfileUuid}
              editUserFields={editStudentFields}
              setEditUserFields={setEditStudentFields}
              isUpdatingUser={isUpdatingStudent}
              updateUserError={updateStudentError}
              setUpdateUserError={setUpdateStudentError}
              handleUpdateUser={handleUpdateStudent}
              isDeleteUserOpen={isDeleteStudentOpen}
              setIsDeleteUserOpen={setIsDeleteStudentOpen}
              selectedDeleteProfileUuid={selectedDeleteProfileUuid}
              setSelectedDeleteProfileUuid={setSelectedDeleteProfileUuid}
              isDeleteConfirmed={isDeleteConfirmed}
              setIsDeleteConfirmed={setIsDeleteConfirmed}
              isDeletingUser={isDeletingStudent}
              deleteUserError={deleteStudentError}
              setDeleteUserError={setDeleteStudentError}
              handleDeleteUser={handleDeleteStudent}
            />
          )}
          </Suspense>
        </section>
      </div>
    </main>
  )
}

export default Overview