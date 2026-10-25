import { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import PaginationControls from './PaginationControls.jsx'

const formatAverage = (value, suffix = '') => (
  Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : '-'
)

const formatStudentName = (profile, fallback) => {
  const firstName = profile?.first_name?.trim()
  const lastName = profile?.last_name?.trim()
  const middleInitial = profile?.middle_name?.trim()?.[0]
  const name = [lastName, firstName && `${firstName}${middleInitial ? ` ${middleInitial}.` : ''}`]
    .filter(Boolean)
    .join(', ')

  return name || fallback
}

export default function Leaderboard() {
  const [students, setStudents] = useState([])
  const [sortBy, setSortBy] = useState('grade')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadLeaderboard = async () => {
      const studentsByUser = new Map()
      const pageSize = 1000

      try {
        for (let offset = 0; ; offset += pageSize) {
          const { data, error: queryError } = await supabase
            .from('records')
            .select('user, corr_percent, time_elapsed_sec, profile:profiles!user(last_name, first_name, middle_name)')
            .range(offset, offset + pageSize - 1)

          if (queryError) throw queryError

          for (const record of data ?? []) {
            if (record.user === null || record.user === undefined || String(record.user) === '') continue

            const userId = String(record.user)
            const student = studentsByUser.get(userId) ?? {
              id: userId,
              name: formatStudentName(record.profile, userId),
              gradeTotal: 0,
              gradeCount: 0,
              timeTotal: 0,
              timeCount: 0,
            }

            const grade = Number(record.corr_percent)
            if (record.corr_percent !== null && Number.isFinite(grade)) {
              student.gradeTotal += grade
              student.gradeCount += 1
            }

            const time = Number(record.time_elapsed_sec)
            if (record.time_elapsed_sec !== null && Number.isFinite(time)) {
              student.timeTotal += time
              student.timeCount += 1
            }

            studentsByUser.set(userId, student)
          }

          if ((data ?? []).length < pageSize) break
        }

        if (!isMounted) return

        setStudents(Array.from(studentsByUser.values(), (student) => ({
          ...student,
          averageGrade: student.gradeCount ? student.gradeTotal / student.gradeCount : null,
          averageTime: student.timeCount ? student.timeTotal / student.timeCount : null,
        })))
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Unable to load leaderboard.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadLeaderboard()

    return () => {
      isMounted = false
    }
  }, [])

  const sortedStudents = [...students].sort((first, second) => {
    const firstValue = sortBy === 'grade' ? first.averageGrade : first.averageTime
    const secondValue = sortBy === 'grade' ? second.averageGrade : second.averageTime

    if (firstValue === null) return secondValue === null ? first.name.localeCompare(second.name) : 1
    if (secondValue === null) return -1

    return (sortBy === 'grade' ? secondValue - firstValue : firstValue - secondValue)
      || first.name.localeCompare(second.name)
  })
  const pageCount = Math.max(1, Math.ceil(sortedStudents.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageStudents = sortedStudents.slice((page - 1) * 10, page * 10)

  return (
    <div className="dashboard-content">
      <p className="view-hint">Ranking of users using their average from all records played.</p>
      <div className="records-sort-controls" role="group" aria-label="Sort leaderboard">
        <button
          type="button"
          aria-pressed={sortBy === 'grade'}
          onClick={() => {
            setSortBy('grade')
            setCurrentPage(1)
          }}
        >
          Highest Grade
        </button>
        <button
          type="button"
          aria-pressed={sortBy === 'time'}
          onClick={() => {
            setSortBy('time')
            setCurrentPage(1)
          }}
        >
          Fastest Time
        </button>
      </div>
      {isLoading && <p>Loading leaderboard...</p>}
      {error && <p className="records-error" role="alert">Unable to load leaderboard: {error}</p>}
      {!isLoading && !error && students.length === 0 && <p>No leaderboard records found.</p>}
      {!isLoading && !error && students.length > 0 && (
        <>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={sortedStudents.length}
            onPageChange={setCurrentPage}
          />
          <div className="records-table-wrapper">
            <table className="records-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Name</th>
                  <th scope="col">Avg. Grade</th>
                  <th scope="col">Avg. Time</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map(({ id, name, averageGrade, averageTime }, index) => (
                  <tr key={id}>
                    <td>#{(page - 1) * 10 + index + 1}</td>
                    <td>{name}</td>
                    <td>{formatAverage(averageGrade, '%')}</td>
                    <td>{formatAverage(averageTime, ' sec')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}