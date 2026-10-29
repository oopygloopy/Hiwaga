import { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import PaginationControls from './PaginationControls.jsx'
import GradeDistribution from './charts/gradedistribution.jsx'
import { formatAverage, getProfileLabel, shortenName } from './utils/formatters'
import firstMedalIcon from './assets/firstplace.svg'
import secondMedalIcon from './assets/secondplace.svg'
import thirdMedalIcon from './assets/thirdplace.svg'

export default function Leaderboard() {
  const [students, setStudents] = useState([])
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [sortBy, setSortBy] = useState('grade')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadLeaderboard = async () => {
      const pageSize = 1000
      const allRecords = []

      try {
        const sectionsPromise = supabase
          .from('sections')
          .select('id, section_name')
          .order('section_name', { ascending: true })

        for (let offset = 0; ; offset += pageSize) {
          const { data, error: queryError } = await supabase
            .from('records')
            .select('user, corr_percent, time_elapsed_sec, finished_at, chapter, profile:profiles!user(last_name, first_name, middle_name, section, section_rel:sections!section(section_name))')
            .range(offset, offset + pageSize - 1)

          if (queryError) throw queryError

          allRecords.push(...(data ?? []))

          if ((data ?? []).length < pageSize) break
        }

        const { data: sectionData } = await sectionsPromise
        if (sectionData) {
          setSections(
            sectionData.filter((s) => s.id !== null && s.section_name && String(s.section_name).trim() !== '')
          )
        }

        const sortedRecords = [...allRecords].sort((a, b) => {
          const timeA = Date.parse(a.finished_at) || 0
          const timeB = Date.parse(b.finished_at) || 0
          return timeA - timeB
        })

        const studentsByUser = new Map()
        const userChapterPlays = new Map()

        for (const record of sortedRecords) {
          if (record.user === null || record.user === undefined || String(record.user) === '') continue

          const userId = String(record.user)
          const sectionName = record.profile?.section_rel?.section_name
            ? String(record.profile.section_rel.section_name)
            : (record.profile?.section !== null && record.profile?.section !== undefined ? String(record.profile.section) : '')

          const student = studentsByUser.get(userId) ?? {
            id: userId,
            name: getProfileLabel(record.profile, userId),
            section: sectionName,
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

          if (record.chapter !== null && record.chapter !== undefined && String(record.chapter) !== '') {
            const key = `${userId}:::${record.chapter}`
            if (!userChapterPlays.has(key)) userChapterPlays.set(key, [])
            userChapterPlays.get(key).push(record)
          }
        }

        const studentGrowthMap = new Map()
        for (const [key, plays] of userChapterPlays.entries()) {
          const [userId] = key.split(':::')
          const initialPlay = plays[0]
          const latestPlay = plays[plays.length - 1]
          const initScore = Number(initialPlay.corr_percent)
          const lateScore = Number(latestPlay.corr_percent)

          if (Number.isFinite(initScore) && Number.isFinite(lateScore)) {
            const growthData = studentGrowthMap.get(userId) ?? { totalGrowth: 0, chapterCount: 0 }
            growthData.totalGrowth += (lateScore - initScore)
            growthData.chapterCount += 1
            studentGrowthMap.set(userId, growthData)
          }
        }

        if (!isMounted) return

        setStudents(Array.from(studentsByUser.values(), (student) => {
          const growthInfo = studentGrowthMap.get(student.id)
          const averageGrowth = growthInfo && growthInfo.chapterCount > 0
            ? growthInfo.totalGrowth / growthInfo.chapterCount
            : null

          return {
            ...student,
            averageGrade: student.gradeCount ? student.gradeTotal / student.gradeCount : null,
            averageTime: student.timeCount ? student.timeTotal / student.timeCount : null,
            averageGrowth,
          }
        }))
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
      if (firstTime !== secondTime) return firstTime - secondTime

      // Tie-breaker: higher grade
      const firstGrade = firstStudent.averageGrade ?? 0
      const secondGrade = secondStudent.averageGrade ?? 0
      return secondGrade - firstGrade
    }

    if (sortBy === 'growth') {
      const firstGrowth = firstStudent.averageGrowth
      const secondGrowth = secondStudent.averageGrowth

      if (firstGrowth === null && secondGrowth === null) return 0
      if (firstGrowth === null) return 1
      if (secondGrowth === null) return -1
      if (firstGrowth !== secondGrowth) return secondGrowth - firstGrowth

      // Tie-breaker: higher grade
      const firstGrade = firstStudent.averageGrade ?? 0
      const secondGrade = secondStudent.averageGrade ?? 0
      return secondGrade - firstGrade
    }

    // Default: Sort by grade with time as tie-breaker
    const firstGrade = firstStudent.averageGrade
    const secondGrade = secondStudent.averageGrade

    if (firstGrade === null && secondGrade === null) return 0
    if (firstGrade === null) return 1
    if (secondGrade === null) return -1

    if (firstGrade !== secondGrade) {
      return secondGrade - firstGrade
    }

    // Exact score tie-breaker: faster average time wins
    const firstTime = firstStudent.averageTime ?? Number.POSITIVE_INFINITY
    const secondTime = secondStudent.averageTime ?? Number.POSITIVE_INFINITY
    return firstTime - secondTime
  })

  // Filter students by selected section
  const filteredStudents = selectedSection
    ? sortedStudents.filter((s) => String(s.section ?? '').trim().toLowerCase() === selectedSection.trim().toLowerCase())
    : sortedStudents

  // Podium (Top 3 of filtered results)
  const topThree = filteredStudents.slice(0, 3)
  const remainingStudents = filteredStudents.slice(3)

  const pageCount = Math.max(1, Math.ceil(remainingStudents.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageStudents = remainingStudents.slice((page - 1) * 10, page * 10)

  // Podium order: Silver (2nd) on left, Gold (1st) in center, Bronze (3rd) on right
  const podiumOrder = []
  if (topThree.length >= 2) podiumOrder.push({ ...topThree[1], rank: 2, medalImg: secondMedalIcon, title: '2nd Place', cls: 'podium-silver' })
  if (topThree.length >= 1) podiumOrder.push({ ...topThree[0], rank: 1, medalImg: firstMedalIcon, title: '1st Place', cls: 'podium-gold' })
  if (topThree.length >= 3) podiumOrder.push({ ...topThree[2], rank: 3, medalImg: thirdMedalIcon, title: '3rd Place', cls: 'podium-bronze' })

  const getMetricDisplay = (student) => {
    if (sortBy === 'time') {
      return `${formatAverage(student.averageTime, 's')} (${formatAverage(student.averageGrade, '%')})`
    }
    if (sortBy === 'growth') {
      const g = student.averageGrowth
      const growthStr = g !== null ? `${g >= 0 ? '+' : ''}${g.toFixed(1)}%` : '-'
      return `${growthStr} (${formatAverage(student.averageGrade, '%')})`
    }
    return `${formatAverage(student.averageGrade, '%')}${student.averageTime !== null ? ` • ${Math.round(student.averageTime)}s avg` : ''}`
  }

  return (
    <div className="dashboard-content">
      <p className="view-hint">Ranking of users using their average from all records played.</p>

      {/* Grade Distribution Chart (DepEd Brackets) */}
      {!isLoading && !error && filteredStudents.length > 0 && (
        <GradeDistribution students={filteredStudents} />
      )}

      <div className="records-toolbar" style={{ paddingTop: 0, marginBottom: '16px' }}>
        <div className="records-filter-controls">
          <label htmlFor="leaderboard-section-filter">
            Section
            <select
              id="leaderboard-section-filter"
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All sections</option>
              {sections.map(({ id, section_name }) => (
                <option key={id} value={section_name}>{section_name}</option>
              ))}
            </select>
          </label>
        </div>

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
            aria-pressed={sortBy === 'growth'}
            onClick={() => {
              setSortBy('growth')
              setCurrentPage(1)
            }}
          >
            Most Improved
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
      </div>

      {isLoading && <p>Loading leaderboard...</p>}
      {error && <p className="records-error" role="alert">Unable to load leaderboard: {error}</p>}
      {!isLoading && !error && students.length === 0 && <p>No leaderboard records found.</p>}
      {!isLoading && !error && students.length > 0 && filteredStudents.length === 0 && (
        <p>No students found in this section.</p>
      )}

      {!isLoading && !error && filteredStudents.length > 0 && (
        <>
          {/* Podium for Top 3 */}
          <div className="leaderboard-podium" aria-label="Top 3 Students Podium">
            {podiumOrder.map((student) => (
              <div key={student.id} className={`podium-card ${student.cls}`}>
                <div className="podium-badge" aria-hidden="true">
                  <img className="podium-medal-img" src={student.medalImg} alt="" />
                </div>
                <span className="podium-rank">{student.title}</span>
                <span className="podium-name" title={student.name}>{student.name}</span>
                <span className="podium-stat">{getMetricDisplay(student)}</span>
                <span className="podium-plays">
                  {student.gradeCount} {student.gradeCount === 1 ? 'play' : 'plays'}
                </span>
              </div>
            ))}
          </div>

          {/* Table for Rank 4 and above */}
          {remainingStudents.length > 0 ? (
            <>
              <h3 style={{ margin: '24px 0 12px', fontSize: '18px', color: 'var(--text-h)' }}>
                Other Rankings
              </h3>
              <PaginationControls
                page={page}
                pageCount={pageCount}
                rowCount={remainingStudents.length}
                onPageChange={setCurrentPage}
              />
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Name</th>
                      <th scope="col">Avg. Grade</th>
                      <th scope="col">Improvement</th>
                      <th scope="col">Avg. Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageStudents.map(({ id, name, averageGrade, averageGrowth, averageTime }, index) => {
                      const actualRank = 3 + (page - 1) * 10 + index + 1
                      return (
                        <tr key={id}>
                          <td>#{actualRank}</td>
                          <td title={name}>
                            <span className="name-full">{name}</span>
                            <span className="name-short">{shortenName(name)}</span>
                          </td>
                          <td>{formatAverage(averageGrade, '%')}</td>
                          <td>
                            {averageGrowth === null ? (
                              '-'
                            ) : (
                              <span style={{ color: averageGrowth > 0 ? '#2f9e44' : averageGrowth < 0 ? '#e03131' : 'inherit', fontWeight: 600 }}>
                                {averageGrowth >= 0 ? '+' : ''}{averageGrowth.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td>{formatAverage(averageTime, ' sec')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p style={{ marginTop: '16px', color: 'var(--text)' }}>All students are displayed on the podium.</p>
          )}
        </>
      )}
    </div>
  )
}
