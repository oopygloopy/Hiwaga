import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'
import SearchableSelect from './SearchableSelect.jsx'
import { formatCell, getProfileLabel } from './utils/formatters'

const OverallStats = lazy(() => import('./charts/overallstats.jsx'))

const PAGE_SIZE = 10
const RECORD_COLUMNS = ['Name', 'Chapter', 'Score', 'Date & Time', 'Duration (s)']

const formatRecord = (r) => {
  const name = getProfileLabel(r.profile, String(r.user ?? ''))
  const finishedDate = r.finished_at ? new Date(r.finished_at) : null
  const dateFormatted = finishedDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(finishedDate)
    : '-'
  const scoreVal = r.corr_percent !== null && r.corr_percent !== undefined ? Number(r.corr_percent) : null
  const totalQ = r.total_question !== null && r.total_question !== undefined ? Number(r.total_question) : null
  const correctCount = r.correct_ans !== null && r.correct_ans !== undefined ? Number(r.correct_ans) : null

  return {
    id: r.record_id,
    Name: name,
    Chapter: r.chapter !== null && r.chapter !== undefined ? String(r.chapter) : '-',
    Score: scoreVal !== null ? `${scoreVal.toFixed(1)}%` : '-',
    'Date & Time': dateFormatted,
    'Duration (s)': r.time_elapsed_sec ?? '-',
    rawScore: scoreVal,
    rawCorrect: correctCount,
    rawTotal: totalQ,
    rawTimestamp: r.finished_at ? Date.parse(r.finished_at) : 0,
  }
}

export default function Records({
  scoreXAxis,
  setScoreXAxis,
}) {
  const [records, setRecords] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState({ column: 'Date & Time', direction: -1 })
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [sections, setSections] = useState([])
  const [chapterOptions] = useState(['1', '2', '3', '4'])
  const [chartMetric, setChartMetric] = useState('corr_percent')
  const [isExporting, setIsExporting] = useState(false)

  // Load user options and section options
  useEffect(() => {
    let isMounted = true

    const loadOptions = async () => {
      const [profilesResult, sectionsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, middle_name, section, section_rel:sections!section(section_name)')
          .order('last_name', { ascending: true }),
        supabase
          .from('sections')
          .select('id, section_name')
          .order('section_name', { ascending: true }),
      ])

      if (!isMounted) return

      if (profilesResult.data) {
        setAllUsers(profilesResult.data)
      }

      if (sectionsResult.data) {
        setSections(
          sectionsResult.data.filter((s) => s.id !== null && s.section_name && String(s.section_name).trim() !== '')
        )
      }
    }

    loadOptions()

    return () => {
      isMounted = false
    }
  }, [])

  // Filter user dropdown options by selected section
  const userOptions = allUsers
    .filter((p) => {
      if (!p.user_id) return false
      if (!selectedSection) return true
      const sectionName = p.section_rel?.section_name || (p.section !== null && p.section !== undefined ? String(p.section) : '')
      return String(sectionName).trim().toLowerCase() === selectedSection.trim().toLowerCase()
    })
    .map((p) => ({
      value: String(p.user_id),
      label: getProfileLabel(p, String(p.user_id)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Fetch records page from Supabase
  useEffect(() => {
    let isMounted = true

    const fetchRecordsPage = async () => {
      setIsLoading(true)
      setError('')

      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('records')
        .select(
          'record_id, corr_percent, correct_ans, total_question, time_elapsed_sec, finished_at, chapter, user, profile:profiles!user(first_name, last_name, middle_name, section, section_rel:sections!section(section_name))',
          { count: 'exact' }
        )

      if (selectedUser) {
        query = query.eq('user', selectedUser)
      }

      if (selectedChapter) {
        query = query.eq('chapter', selectedChapter)
      }

      // Column sorting mapped to Supabase database columns
      const isAsc = sort.direction === 1
      if (sort.column === 'Score') {
        query = query.order('corr_percent', { ascending: isAsc })
      } else if (sort.column === 'Chapter') {
        query = query.order('chapter', { ascending: isAsc })
      } else if (sort.column === 'Duration (s)') {
        query = query.order('time_elapsed_sec', { ascending: isAsc })
      } else {
        query = query.order('finished_at', { ascending: isAsc })
      }

      const { data, count, error: queryError } = await query

      if (!isMounted) return

      if (queryError) {
        setError(queryError.message)
        setIsLoading(false)
        return
      }

      // Filter by section on client side if records are returned
      let matchedRows = (data ?? []).map(formatRecord)
      let currentTotal = count ?? 0

      if (selectedSection) {
        const rawFiltered = (data ?? []).filter((r) => {
          const sec = r.profile?.section_rel?.section_name || (r.profile?.section !== null && r.profile?.section !== undefined ? String(r.profile.section) : '')
          return String(sec).trim().toLowerCase() === selectedSection.trim().toLowerCase()
        })
        currentTotal = rawFiltered.length
        matchedRows = rawFiltered.slice(from, to + 1).map(formatRecord)
      } else {
        matchedRows = matchedRows.slice(from, to + 1)
      }

      setRecords(matchedRows)
      setTotalCount(currentTotal)
      setIsLoading(false)
    }

    fetchRecordsPage()

    return () => {
      isMounted = false
    }
  }, [currentPage, sort, selectedUser, selectedChapter, selectedSection])

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(currentPage, pageCount)

  const handleSortChange = (column) => {
    setSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 1 ? -1 : 1 }
      }
      return { column, direction: -1 }
    })
    setCurrentPage(1)
  }

  const fetchExportRecords = async () => {
    let query = supabase
      .from('records')
      .select('record_id, corr_percent, correct_ans, total_question, time_elapsed_sec, finished_at, chapter, user, profile:profiles!user(first_name, last_name, middle_name, section, section_rel:sections!section(section_name))')

    if (selectedUser) query = query.eq('user', selectedUser)
    if (selectedChapter) query = query.eq('chapter', selectedChapter)

    const isAsc = sort.direction === 1
    if (sort.column === 'Score') {
      query = query.order('corr_percent', { ascending: isAsc })
    } else if (sort.column === 'Chapter') {
      query = query.order('chapter', { ascending: isAsc })
    } else if (sort.column === 'Duration (s)') {
      query = query.order('time_elapsed_sec', { ascending: isAsc })
    } else {
      query = query.order('finished_at', { ascending: isAsc })
    }

    const { data, error: exportError } = await query.limit(5000)
    if (exportError) throw exportError

    let results = data ?? []
    if (selectedSection) {
      results = results.filter((r) => {
        const sec = r.profile?.section_rel?.section_name || (r.profile?.section !== null && r.profile?.section !== undefined ? String(r.profile.section) : '')
        return String(sec).trim().toLowerCase() === selectedSection.trim().toLowerCase()
      })
    }
    return results.map(formatRecord)
  }

  const exportRecordsToPdf = async () => {
    try {
      setIsExporting(true)
      const exportRows = await fetchExportRecords()
      if (exportRows.length === 0) return

      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const columns = RECORD_COLUMNS
      const pdf = new jsPDF({ orientation: 'landscape' })

      pdf.setFontSize(16)
      pdf.text('Records', 14, 16)
      autoTable(pdf, {
        startY: 22,
        head: [columns],
        body: exportRows.map((row) => columns.map((column) => formatCell(row[column]))),
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [65, 105, 225] },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: 0,
      })

      const date = new Date().toISOString().slice(0, 10)
      pdf.save(`Records-${date}.pdf`)
    } catch (err) {
      setError(err.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const exportRecordsToCsv = async () => {
    try {
      setIsExporting(true)
      const exportRows = await fetchExportRecords()
      if (exportRows.length === 0) return

      const columns = RECORD_COLUMNS
      const escapeCsvCell = (value) => `"${formatCell(value).replaceAll('"', '""')}"`
      const csv = [
        columns.map(escapeCsvCell).join(','),
        ...exportRows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(',')),
      ].join('\r\n')
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      const date = new Date().toISOString().slice(0, 10)
      link.download = `Records-${date}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="dashboard-content">
      <p className="view-hint">Shows details of every record played.</p>
      <Suspense fallback={<p className="view-hint" role="status">Loading chart...</p>}>
        <OverallStats
          xAxis={scoreXAxis}
          setScoreXAxis={setScoreXAxis}
          metric={chartMetric}
          setMetric={setChartMetric}
        />
      </Suspense>

      <div className="records-toolbar">
        <div className="records-filter-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '190px' }}>
            <span>User</span>
            <SearchableSelect
              options={userOptions}
              value={selectedUser}
              onChange={(val) => {
                setSelectedUser(val)
                setCurrentPage(1)
              }}
              placeholder="All users"
            />
          </div>

          <label>
            Chapter
            <select
              value={selectedChapter}
              onChange={(event) => {
                setSelectedChapter(event.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All chapters</option>
              {chapterOptions.map((chapter) => (
                <option key={chapter} value={chapter}>{chapter}</option>
              ))}
            </select>
          </label>

          <label>
            Section
            <select
              value={selectedSection}
              onChange={(event) => {
                setSelectedSection(event.target.value)
                setSelectedUser('') // Reset selected user when section changes
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="records-export-button"
            type="button"
            onClick={exportRecordsToPdf}
            disabled={isLoading || isExporting || totalCount === 0}
          >
            {isExporting ? 'Exporting...' : 'Export as PDF'}
          </button>
          <button
            className="records-export-button"
            type="button"
            onClick={exportRecordsToCsv}
            disabled={isLoading || isExporting || totalCount === 0}
          >
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        </div>
      </div>

      {/* Initial load: no data yet and loading */}
      {isLoading && records.length === 0 && totalCount === 0 && !selectedUser && !selectedChapter && !selectedSection && (
        <p>Loading records...</p>
      )}
      {error && <p className="records-error" role="alert">Unable to load records: {error}</p>}

      {/* Render the table with fixed 10 rows. If no records match, show 10 "No record" rows to avoid layout shifts. */}
      {!error && (records.length > 0 || (!isLoading && totalCount === 0)) && (
        <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s ease', pointerEvents: isLoading ? 'none' : 'auto' }}>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={totalCount}
            onPageChange={setCurrentPage}
          />
          <DataTable
            rows={
              records.length > 0
                ? [
                    ...records,
                    ...Array.from({ length: Math.max(0, PAGE_SIZE - records.length) }, (_, i) => ({ _placeholder: true, id: `placeholder-${i}` })),
                  ]
                : Array.from({ length: PAGE_SIZE }, (_, i) => ({ _placeholder: true, id: `placeholder-${i}` }))
            }
            columns={RECORD_COLUMNS}
            excludeColumns={['_placeholder', 'rawScore', 'rawTimestamp', 'rawCorrect', 'rawTotal']}
            sort={sort}
            onSort={handleSortChange}
          />
        </div>
      )}
    </div>
  )
}
