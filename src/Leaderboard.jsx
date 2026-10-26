import { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import PaginationControls from './PaginationControls.jsx'
import { formatAverage, getProfileLabel } from './utils/formatters'

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
              name: getProfileLabel(record.profile, userId),
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
      } catch (queryError) {
        if (!isMounted) return
        setError(queryError?.message || 'Unable to load leaderboard.')
        setStudents([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadLeaderboard()

    return () => {
      isMounted = false
    }
  }, [])

  const sortedStudents = [...students].sort((firstStudent, secondStudent) => {
    if (sortBy === 'time') {
      const firstTime = firstStudent.averageTime
      const secondTime = secondStudent.averageTime

      if (firstTime === null && secondTime === null) return 0
      if (firstTime === null) return 1
      if (secondTime === null) return -1

      return firstTime - secondTime
    }

    const firstGrade = firstStudent.averageGrade
    const secondGrade = secondStudent.averageGrade

    if (firstGrade === null && secondGrade === null) return 0
    if (firstGrade === null) return 1
    if (secondGrade === null) return -1

    return secondGrade - firstGrade
  })

  const pageCount = Math.max(1, Math.ceil(sortedStudents.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageStudents = sortedStudents.slice((page - 1) * 10, page * 10)

  return (
    <div className="dashboard-content">
      <p className="view-hint">Ranking of users using their average from all records played.</p>
      <div className="records-sort-controls">
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
