import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'
import SearchableSelect from './SearchableSelect.jsx'
import { formatCell, getColumns, getProfileLabel } from './utils/formatters'

const OverallStats = lazy(() => import('./charts/overallstats.jsx'))

const PAGE_SIZE = 10

const formatRecord = (r) => {
  const name = getProfileLabel(r.profile, String(r.user ?? ''))
  const finishedDate = r.finished_at ? new Date(r.finished_at) : null
  const dateStr = finishedDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(finishedDate)
    : '-'
  const timeStr = finishedDate
    ? new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(finishedDate)
    : '-'
  const scoreVal = r.corr_percent !== null && r.corr_percent !== undefined ? Number(r.corr_percent) : null
  const totalQ = r.total_question !== null && r.total_question !== undefined ? Number(r.total_question) : null
  const correctCount = r.correct_ans !== null && r.correct_ans !== undefined ? Number(r.correct_ans) : null

  return {
    id: r.record_id,
    Name: name,
    Chapter: r.chapter !== null && r.chapter !== undefined ? String(r.chapter) : '-',
    Score: scoreVal !== null ? `${scoreVal.toFixed(1)}%` : '-',
    rawScore: scoreVal,
    rawCorrect: correctCount,
    rawTotal: totalQ,
    Time: timeStr,
    Date: dateStr,
    'Duration (s)': r.time_elapsed_sec ?? '-',
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
  const [sort, setSort] = useState({ column: 'Time', direction: -1 })
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [userOptions, setUserOptions] = useState([])
  const [chapterOptions] = useState(['1', '2', '3', '4', '5'])
  const [chartMetric, setChartMetric] = useState('corr_percent')
  const [isExporting, setIsExporting] = useState(false)

  // Load user options for the filter dropdown
  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, middle_name')
        .order('last_name', { ascending: true })

      if (!isMounted) return

      if (data) {
        const options = data
          .filter((p) => p.user_id)
          .map((p) => ({
            value: String(p.user_id),
            label: getProfileLabel(p, String(p.user_id)),
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
        setUserOptions(options)
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch only the 10 records for the requested page
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
          'record_id, corr_percent, correct_ans, total_question, time_elapsed_sec, finished_at, chapter, user, profile:profiles!user(first_name, last_name, middle_name)',
          { count: 'exact' }
        )

      if (selectedUser) {
        query = query.eq('user', selectedUser)
      }

      if (selectedChapter) {
        query = query.eq('chapter', selectedChapter)
      }

      if (sort.column === 'Score') {
        query = query.order('corr_percent', { ascending: sort.direction === 1 })
      } else {
        query = query.order('finished_at', { ascending: sort.direction === 1 })
      }

      query = query.range(from, to)

      const { data, count, error: queryError } = await query

      if (!isMounted) return

      if (queryError) {
        setError(queryError.message)
      } else {
        setRecords((data ?? []).map(formatRecord))
        setTotalCount(count ?? 0)
      }

      setIsLoading(false)
    }

    fetchRecordsPage()

    return () => {
      isMounted = false
    }
  }, [currentPage, sort, selectedUser, selectedChapter])

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(currentPage, pageCount)

  const fetchExportRecords = async () => {
    let query = supabase
      .from('records')
      .select('record_id, corr_percent, correct_ans, total_question, time_elapsed_sec, finished_at, chapter, user, profile:profiles!user(first_name, last_name, middle_name)')

    if (selectedUser) query = query.eq('user', selectedUser)
    if (selectedChapter) query = query.eq('chapter', selectedChapter)
    if (sort.column === 'Score') {
      query = query.order('corr_percent', { ascending: sort.direction === 1 })
    } else {
      query = query.order('finished_at', { ascending: sort.direction === 1 })
    }

    const { data, error: exportError } = await query.limit(5000)
    if (exportError) throw exportError
    return (data ?? []).map(formatRecord)
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
      const columns = getColumns(exportRows, ['rawScore', 'rawTimestamp', 'rawCorrect', 'rawTotal'])
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

      const columns = getColumns(exportRows, ['rawScore', 'rawTimestamp', 'rawCorrect', 'rawTotal'])
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
        </div>
        <nav className="records-sort-controls" aria-label="Sort records">
          <button
            type="button"
            aria-pressed={sort?.column === 'Time'}
            onClick={() => {
              setSort({ column: 'Time', direction: -1 })
              setCurrentPage(1)
            }}
          >
            Time: newest first
          </button>
          <button
            type="button"
            aria-pressed={sort?.column === 'Score'}
            onClick={() => {
              setSort({ column: 'Score', direction: -1 })
              setCurrentPage(1)
            }}
          >
            Score: highest first
          </button>
        </nav>
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

      {/* Initial load: no data yet */}
      {isLoading && records.length === 0 && <p>Loading records...</p>}
      {error && <p className="records-error" role="alert">Unable to load records: {error}</p>}
      {!isLoading && !error && totalCount === 0 && records.length === 0 && <p>No records found.</p>}
      {/* Keep table mounted while paginating — dim it so scroll position is preserved.
          Pad to PAGE_SIZE rows so the table height stays fixed across pages. */}
      {records.length > 0 && (
        <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s ease', pointerEvents: isLoading ? 'none' : 'auto' }}>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={totalCount}
            onPageChange={setCurrentPage}
          />
          <DataTable
            rows={[
              ...records,
              ...Array.from({ length: Math.max(0, PAGE_SIZE - records.length) }, (_, i) => ({ _placeholder: true, id: `placeholder-${i}` })),
            ]}
            excludeColumns={['rawScore', 'rawTimestamp', 'rawCorrect', 'rawTotal']}
          />
        </div>
      )}
    </div>
  )
}
