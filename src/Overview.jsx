import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import hiwagaLogo from './assets/hiwagalogo.png'
import {
  compareRecordsByTime,
  getColumns,
  getProfileLabel,
  getProfileUuid,
} from './utils/formatters'

const LearningProgression = lazy(() => import('./charts/learningprogression.jsx'))
const Records = lazy(() => import('./Records.jsx'))
const Students = lazy(() => import('./Students.jsx'))
const Teachers = lazy(() => import('./Teachers.jsx'))
const Questions = lazy(() => import('./Questions.jsx'))
const Leaderboard = lazy(() => import('./Leaderboard.jsx'))

const dashboardViews = ['overview', 'leaderboard', 'records', 'questions', 'students', 'teachers']
const activeViewStorageKey = 'hiwaga-dashboard-active-view'

function Overview({ user }) {
  const [activeView, setActiveView] = useState(() => {
    const savedView = window.localStorage.getItem(activeViewStorageKey)
    return savedView === 'users' ? 'students' : savedView === 'teachers' ? 'overview' : dashboardViews.includes(savedView) ? savedView : 'overview'
  })
  const [isSignOutOpen, setIsSignOutOpen] = useState(false)
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => {
    if (!isNavOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNavOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNavOpen])
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
  const [overviewStats, setOverviewStats] = useState({
    studentCount: null,
    averageGrade: null,
    totalQuestionsAnswered: null,
    totalRecords: null,
    avgGrowth: null,
    avgInitial: null,
    avgLatest: null,
    initialMasteryRate: null,
    latestMasteryRate: null,
  })
  const [chapterProgression, setChapterProgression] = useState([])
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [studentAverages, setStudentAverages] = useState([])
  const [sort, setSort] = useState({ column: 'Time', direction: -1 })
  const [scoreXAxis, setScoreXAxis] = useState('attempt')

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
          const allRecords = []
          const pageSize = 1000

          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabase
              .from('records')
              .select('corr_percent, total_question, chapter, finished_at, user, profile:profiles!user(first_name, last_name)')
              .range(offset, offset + pageSize - 1)

            if (error) {
              return {
                average: null,
                totalQuestionsAnswered: null,
                totalRecords: null,
                avgGrowth: null,
                avgInitial: null,
                avgLatest: null,
                initialMasteryRate: null,
                latestMasteryRate: null,
                chapterProgression: [],
                students: [],
                error: error.message,
              }
            }

            totalRecords += (data ?? []).length
            allRecords.push(...(data ?? []))

            if ((data ?? []).length < pageSize) break
          }

          const sortedChronological = [...allRecords].sort((a, b) => {
            const timeA = Date.parse(a.finished_at) || 0
            const timeB = Date.parse(b.finished_at) || 0
            return timeA - timeB
          })

          const userChapterMap = new Map()
          const studentsMap = new Map()

          for (const record of sortedChronological) {
            const value = Number(record.corr_percent)
            if (record.corr_percent !== null && Number.isFinite(value)) {
              total += value
              count += 1
            }

            const questions = Number(record.total_question)
            if (record.total_question !== null && Number.isFinite(questions)) {
              totalQuestionsAnswered += questions
            }

            const userId = record.user === null || record.user === undefined ? '' : String(record.user)
            if (userId) {
              if (!studentsMap.has(userId)) {
                studentsMap.set(userId, {
                  id: userId,
                  name: [record.profile?.first_name, record.profile?.last_name].filter(Boolean).join(' ') || userId,
                  total: 0,
                  count: 0,
                  initialScoreTotal: 0,
                  latestScoreTotal: 0,
                  chaptersCount: 0,
                })
              }
              const student = studentsMap.get(userId)
              if (Number.isFinite(value)) {
                student.total += value
                student.count += 1
              }

              if (record.chapter !== null && record.chapter !== undefined && String(record.chapter) !== '') {
                const key = `${userId}:::${record.chapter}`
                if (!userChapterMap.has(key)) userChapterMap.set(key, [])
                userChapterMap.get(key).push(record)
              }
            }
          }

          let totalInitial = 0
          let totalLatest = 0
          let initialPassing = 0
          let latestPassing = 0
          let pairCount = 0
          const chapterMap = new Map()

          for (const [key, plays] of userChapterMap.entries()) {
            const [userId, chapter] = key.split(':::')
            const initialPlay = plays[0]
            const latestPlay = plays[plays.length - 1]

            const initScore = Number(initialPlay.corr_percent)
            const lateScore = Number(latestPlay.corr_percent)

            if (Number.isFinite(initScore) && Number.isFinite(lateScore)) {
              totalInitial += initScore
              totalLatest += lateScore
              if (initScore >= 75) initialPassing += 1
              if (lateScore >= 75) latestPassing += 1
              pairCount += 1

              const student = studentsMap.get(userId)
              if (student) {
                student.initialScoreTotal += initScore
                student.latestScoreTotal += lateScore
                student.chaptersCount += 1
              }

              if (!chapterMap.has(chapter)) {
                chapterMap.set(chapter, {
                  chapter,
                  initialTotal: 0,
                  latestTotal: 0,
                  count: 0,
                  totalPlays: 0,
                })
              }
              const chData = chapterMap.get(chapter)
              chData.initialTotal += initScore
              chData.latestTotal += lateScore
              chData.count += 1
              chData.totalPlays += plays.length
            }
          }

          const avgInitial = pairCount ? totalInitial / pairCount : null
          const avgLatest = pairCount ? totalLatest / pairCount : null
          const avgGrowth = (avgInitial !== null && avgLatest !== null) ? avgLatest - avgInitial : null
          const initialMasteryRate = pairCount ? (initialPassing / pairCount) * 100 : null
          const latestMasteryRate = pairCount ? (latestPassing / pairCount) * 100 : null

          const chapterProgression = Array.from(chapterMap.values(), (ch) => ({
            chapter: `Chapter ${ch.chapter}`,
            rawChapter: ch.chapter,
            initialAvg: Number((ch.initialTotal / ch.count).toFixed(1)),
            latestAvg: Number((ch.latestTotal / ch.count).toFixed(1)),
            growth: Number(((ch.latestTotal - ch.initialTotal) / ch.count).toFixed(1)),
            totalPlays: ch.totalPlays,
          })).sort((first, second) => {
            const numA = Number(first.rawChapter)
            const numB = Number(second.rawChapter)
            if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB
            return String(first.rawChapter).localeCompare(String(second.rawChapter), undefined, { numeric: true })
          })

          const students = Array.from(studentsMap.values(), (student) => {
            const avg = student.count ? student.total / student.count : 0
            const initAvg = student.chaptersCount ? student.initialScoreTotal / student.chaptersCount : avg
            const lateAvg = student.chaptersCount ? student.latestScoreTotal / student.chaptersCount : avg
            const growth = lateAvg - initAvg
            return {
              id: student.id,
              name: student.name,
              average: avg,
              initialAvg: initAvg,
              latestAvg: lateAvg,
              growth,
            }
          }).sort((first, second) => first.name.localeCompare(second.name))

          return {
            average: count ? total / count : null,
            totalQuestionsAnswered,
            totalRecords,
            avgGrowth,
            avgInitial,
            avgLatest,
            initialMasteryRate,
            latestMasteryRate,
            chapterProgression,
            students,
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
        avgGrowth: averageResult.avgGrowth,
        avgInitial: averageResult.avgInitial,
        avgLatest: averageResult.avgLatest,
        initialMasteryRate: averageResult.initialMasteryRate,
        latestMasteryRate: averageResult.latestMasteryRate,
      })
      setChapterProgression(averageResult.chapterProgression ?? [])
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
      const { data, error } = await supabase
        .from('records')
        .select('record_id, corr_percent, time_elapsed_sec, finished_at, chapter, user, profile:profiles!user(first_name, last_name, middle_name)')
        .order('finished_at', { ascending: false })

      if (!isMounted) {
        return
      }

      if (error) {
        setRecordsError(error.message)
      } else {
        const formatted = (data ?? []).map((r) => {
          const name = getProfileLabel(r.profile, String(r.user ?? ''))
          const finishedDate = r.finished_at ? new Date(r.finished_at) : null
          const dateStr = finishedDate ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(finishedDate) : '-'
          const timeStr = finishedDate ? new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(finishedDate) : '-'
          const scoreVal = r.corr_percent !== null && r.corr_percent !== undefined ? Number(r.corr_percent) : null

          return {
            id: r.record_id,
            Name: name,
            Chapter: r.chapter !== null && r.chapter !== undefined ? String(r.chapter) : '-',
            Score: scoreVal !== null ? `${scoreVal.toFixed(1)}%` : '-',
            rawScore: scoreVal,
            Time: timeStr,
            Date: dateStr,
            'Duration (s)': r.time_elapsed_sec ?? '-',
            rawTimestamp: r.finished_at ? Date.parse(r.finished_at) : 0,
          }
        })
        setRecords(formatted)
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
      const { data, error } = await supabase
        .from('records')
        .select('record_id, corr_percent, time_elapsed_sec, finished_at, chapter, user, profile:profiles!user(first_name, last_name, middle_name)')
        .order('finished_at', { ascending: false })
        .limit(5)

      if (!isMounted) return

      if (error) {
        setRecentActivityError(error.message)
      } else {
        setRecentActivityRecords(data ?? [])
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
      if (!session?.access_token) throw new Error('Your session has expired. Sign in again to add a user.')

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
        throw new Error(responseData?.message || responseData?.error || `Unable to add user (${response.status}).`)
      }

      setIsAddStudentOpen(false)
      setNewStudent({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
      setStudentsRefreshKey((currentKey) => currentKey + 1)
    } catch (error) {
      setCreateStudentError(error.message || 'Unable to add user.')
    } finally {
      setIsCreatingStudent(false)
    }
  }

  const handleUpdateStudent = async (event) => {
    event.preventDefault()
    setUpdateStudentError('')

    if (!selectedProfileUuid) {
      setUpdateStudentError('Select a user to edit.')
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
      if (!session?.access_token) throw new Error('Your session has expired. Sign in again to edit a user.')

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
        throw new Error(responseData?.message || responseData?.error || `Unable to update user (${response.status}).`)
      }

      setIsEditStudentOpen(false)
      setSelectedProfileUuid('')
      setEditStudentFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
      setStudentsRefreshKey((currentKey) => currentKey + 1)
    } catch (error) {
      setUpdateStudentError(error.message || 'Unable to update user.')
    } finally {
      setIsUpdatingStudent(false)
    }
  }

  const handleDeleteStudent = async (event) => {
    event.preventDefault()
    setDeleteStudentError('')

    if (!selectedDeleteProfileUuid) {
      setDeleteStudentError('Select a user to delete.')
      return
    }
    if (!isDeleteConfirmed) {
      setDeleteStudentError('Confirm that you want to permanently delete this user.')
      return
    }

    setIsDeletingStudent(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.access_token) throw new Error('Your session has expired. Sign in again to delete a user.')

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
        throw new Error(responseData?.message || responseData?.error || `Unable to delete user (${response.status}).`)
      }

      setIsDeleteStudentOpen(false)
      setSelectedDeleteProfileUuid('')
      setIsDeleteConfirmed(false)
      setStudentsRefreshKey((currentKey) => currentKey + 1)
    } catch (error) {
      setDeleteStudentError(error.message || 'Unable to delete user.')
    } finally {
      setIsDeletingStudent(false)
    }
  }

  const recordColumns = getColumns(records)

  const sortedRecords = sort
    ? [...records].sort((firstRecord, secondRecord) => {
      const sortColumn = sort.column === 'alphabetical' ? recordColumns[0] : sort.column
      const firstValue = firstRecord[sortColumn]
      const secondValue = secondRecord[sortColumn]

      if (sortColumn === 'Time' || sortColumn === 'Date') {
        if (firstRecord.rawTimestamp && secondRecord.rawTimestamp) {
          return (firstRecord.rawTimestamp - secondRecord.rawTimestamp) * sort.direction
        }
        return compareRecordsByTime(firstRecord, secondRecord, sort.direction)
      }

      if (sortColumn === 'Score' || sortColumn === 'Grade') {
        const valA = firstRecord.rawScore ?? -1
        const valB = secondRecord.rawScore ?? -1
        return (valA - valB) * sort.direction
      }

      if (firstValue === null || firstValue === undefined) return 1
      if (secondValue === null || secondValue === undefined) return -1

      const firstNumber = Number(firstValue)
      const secondNumber = Number(secondValue)

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
    {
      title: 'Most Improved',
      threshold: 'Growth',
      students: studentAverages
        .filter(({ growth }) => growth > 0)
        .sort((first, second) => second.growth - first.growth)
        .slice(0, 5),
    },
    {
      title: 'Top Students',
      threshold: '≥75',
      students: studentAverages
        .filter(({ average }) => average >= 75)
        .sort((first, second) => second.average - first.average)
        .slice(0, 5),
    },
    {
      title: 'Needs Support',
      threshold: '<75',
      students: studentAverages
        .filter(({ average }) => average < 75)
        .sort((first, second) => first.average - second.average)
        .slice(0, 5),
    },
  ]

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar-header">
            <img className="dashboard-brand-logo" src={hiwagaLogo} alt="Hiwaga" />
            <button
              className={`mobile-nav-toggle ${isNavOpen ? 'is-open' : ''}`}
              type="button"
              aria-label={isNavOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
              aria-expanded={isNavOpen}
              onClick={() => setIsNavOpen((prev) => !prev)}
            >
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
            </button>
          </div>
          <div className={`dashboard-sidebar-content ${isNavOpen ? 'is-open' : ''}`}>
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
                  onClick={() => {
                    setActiveView(id)
                    setIsNavOpen(false)
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button
              className="sign-out-button"
              type="button"
              onClick={() => {
                setIsNavOpen(false)
                setIsSignOutOpen(true)
              }}
            >
              Sign out
            </button>
          </div>
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
              <p className="view-hint">Shows summary of student learning improvement, playthrough records, and play count.</p>
              <section className="overview-stats" aria-label="Overview statistics">
                <div className="overview-stat">
                  <h2>Total Students</h2>
                  <p>{isOverviewLoading ? 'Loading...' : (overviewStats.studentCount ?? '-').toLocaleString()}</p>
                </div>
                <div className="overview-stat">
                  <h2>Total Playthroughs</h2>
                  <p>{isOverviewLoading
                    ? 'Loading...'
                    : (overviewStats.totalRecords ?? '-').toLocaleString()}</p>
                  <p className="overview-stat-sub">
                    {isOverviewLoading || overviewStats.totalQuestionsAnswered === null
                      ? ''
                      : `${overviewStats.totalQuestionsAnswered.toLocaleString()} questions answered`}
                  </p>
                </div>
                <div className="overview-stat">
                  <h2>Avg. Score Growth</h2>
                  <p style={{ color: (overviewStats.avgGrowth ?? 0) >= 0 ? '#2f9e44' : 'inherit' }}>
                    {isOverviewLoading
                      ? 'Loading...'
                      : overviewStats.avgGrowth === null
                        ? '-'
                        : `${overviewStats.avgGrowth >= 0 ? '+' : ''}${overviewStats.avgGrowth.toFixed(1)}%`}
                  </p>
                  <p className="overview-stat-sub">
                    {overviewStats.avgInitial !== null && overviewStats.avgLatest !== null
                      ? `Initial: ${overviewStats.avgInitial.toFixed(1)}% → Latest: ${overviewStats.avgLatest.toFixed(1)}%`
                      : 'From first to latest attempt'}
                  </p>
                </div>
                <div className="overview-stat">
                  <h2>Mastery Rate (≥75%)</h2>
                  <p style={{ color: (overviewStats.latestMasteryRate ?? 0) >= 75 ? '#2f9e44' : 'inherit' }}>
                    {isOverviewLoading
                      ? 'Loading...'
                      : overviewStats.latestMasteryRate === null
                        ? '-'
                        : `${overviewStats.latestMasteryRate.toFixed(1)}%`}
                  </p>
                  <p className="overview-stat-sub">
                    {overviewStats.initialMasteryRate !== null
                      ? `Started at ${overviewStats.initialMasteryRate.toFixed(1)}% (first try)`
                      : 'DepEd mastery standard'}
                  </p>
                </div>
              </section>
              {overviewError && <p className="records-error" role="alert">Unable to load overview statistics: {overviewError}</p>}
              <section className="overview-activity-layout" aria-label="Play count and student scores">
                <div className="overview-activity-primary">
                  <LearningProgression data={chapterProgression} isLoading={isOverviewLoading} />
                  <section className="recent-activity" aria-labelledby="recent-activity-title">
                    <h2 id="recent-activity-title">Recent Activity</h2>
                    {isRecentActivityLoading && <p>Loading recent activity...</p>}
                    {recentActivityError && <p className="records-error" role="alert">Unable to load recent activity: {recentActivityError}</p>}
                    {!isRecentActivityLoading && !recentActivityError && recentActivityRecords.length === 0 && <p>No records found.</p>}
                    {!isRecentActivityLoading && !recentActivityError && recentActivityRecords.length > 0 && (
                      <div className="activity-feed">
                        {recentActivityRecords.map((item) => {
                          const score = item.corr_percent !== null && item.corr_percent !== undefined ? Number(item.corr_percent) : null
                          const scoreColor = score !== null ? (score >= 75 ? '#2f9e44' : score >= 50 ? '#d97706' : '#e03131') : 'var(--text)'
                          const name = getProfileLabel(item.profile, String(item.user ?? 'Student'))
                          const initials = name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'S'
                          const dateStr = item.finished_at
                            ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.finished_at))
                            : '-'

                          return (
                            <div key={item.record_id} className="activity-feed-item">
                              <div className="activity-feed-avatar" aria-hidden="true">{initials}</div>
                              <div className="activity-feed-details">
                                <div className="activity-feed-top">
                                  <span className="activity-feed-name">{name}</span>
                                  <span className="activity-feed-date">{dateStr}</span>
                                </div>
                                <div className="activity-feed-meta">
                                  <span className="activity-feed-chapter">Chapter {item.chapter ?? '-'}</span>
                                  {item.time_elapsed_sec !== null && item.time_elapsed_sec !== undefined && (
                                    <span className="activity-feed-time">{item.time_elapsed_sec}s</span>
                                  )}
                                </div>
                              </div>
                              <div
                                className="activity-feed-score"
                                style={{ backgroundColor: `${scoreColor}18`, color: scoreColor, borderColor: `${scoreColor}40` }}
                              >
                                {score !== null ? `${score.toFixed(0)}%` : '-'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </div>
                <section className="student-score-lists" aria-label="Students by average score">
                  {studentLists.map(({ title, threshold, students: scoreStudents }) => (
                    <section className="student-score-list" key={title}>
                      <h2>{title} <span className="student-score-threshold">{threshold}</span></h2>
                      {isOverviewLoading ? (
                        <p className="student-score-empty">Loading students...</p>
                      ) : scoreStudents.length === 0 ? (
                        <p className="student-score-empty">No students</p>
                      ) : (
                        <ul>
                          {scoreStudents.map(({ id, name, average, growth }) => (
                            <li key={id}>
                              <span>{name}</span>
                              <strong style={threshold === 'Growth' ? { color: '#2f9e44' } : undefined}>
                                {threshold === 'Growth' ? `+${growth.toFixed(1)}%` : average.toFixed(1)}
                              </strong>
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
