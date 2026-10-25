import { lazy, Suspense, useState } from 'react'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'

const OverallStats = lazy(() => import('./charts/overallstats.jsx'))

const formatCell = (value) => {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

const getColumns = (rows) => rows.reduce((allColumns, row) => {
  Object.keys(row).forEach((column) => {
    if (!allColumns.includes(column)) {
      allColumns.push(column)
    }
  })
  return allColumns
}, [])

export default function Records({
  records,
  sort,
  setSort,
  scoreXAxis,
  setScoreXAxis,
  isRecordsLoading,
  recordsError,
  sortedRecords,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [chartMetric, setChartMetric] = useState('corr_percent')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const userOptions = Array.from(new Set(
    sortedRecords
      .filter((record) => record.Name !== null && record.Name !== undefined && String(record.Name) !== '')
      .map((record) => String(record.Name)),
  )).sort((first, second) => first.localeCompare(second))
  const chapterOptions = Array.from(new Set(
    sortedRecords
      .filter((record) => record.Chapter !== null && record.Chapter !== undefined && String(record.Chapter) !== '')
      .map((record) => String(record.Chapter)),
  )).sort((first, second) => first.localeCompare(second, undefined, { numeric: true }))
  const filteredRecords = sortedRecords.filter((record) => (
    (!selectedUser || String(record.Name) === selectedUser)
    && (!selectedChapter || String(record.Chapter) === selectedChapter)
  ))
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageRecords = filteredRecords.slice((page - 1) * 10, page * 10)

  const exportRecordsToPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const columns = getColumns(filteredRecords)
    const pdf = new jsPDF({ orientation: 'landscape' })

    pdf.setFontSize(16)
    pdf.text('Records', 14, 16)
    autoTable(pdf, {
      startY: 22,
      head: [columns],
      body: filteredRecords.map((row) => columns.map((column) => formatCell(row[column]))),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [65, 105, 225] },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
    })

    const date = new Date().toISOString().slice(0, 10)
    pdf.save(`Records-${date}.pdf`)
  }

  const exportRecordsToCsv = () => {
    const columns = getColumns(filteredRecords)
    const escapeCsvCell = (value) => `"${formatCell(value).replaceAll('"', '""')}"`
    const csv = [
      columns.map(escapeCsvCell).join(','),
      ...filteredRecords.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(',')),
    ].join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    const date = new Date().toISOString().slice(0, 10)
    link.download = `Records-${date}.csv`
    link.click()
    URL.revokeObjectURL(url)
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
          <label>
            User
            <select
              value={selectedUser}
              onChange={(event) => {
                setSelectedUser(event.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All users</option>
              {userOptions.map((userName) => (
                <option key={userName} value={userName}>{userName}</option>
              ))}
            </select>
          </label>
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
            aria-pressed={sort?.column === 'Grade'}
            onClick={() => {
              setSort({ column: 'Grade', direction: -1 })
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
          disabled={isRecordsLoading || Boolean(recordsError) || filteredRecords.length === 0}
        >
          Export as PDF
        </button>
        <button
          className="records-export-button"
          type="button"
          onClick={exportRecordsToCsv}
          disabled={isRecordsLoading || Boolean(recordsError) || filteredRecords.length === 0}
        >
          Export to CSV
        </button>
      </div>
      {isRecordsLoading && <p>Loading records...</p>}
      {recordsError && <p className="records-error" role="alert">Unable to load records: {recordsError}</p>}
      {!isRecordsLoading && !recordsError && records.length === 0 && <p>No records found.</p>}
      {!isRecordsLoading && !recordsError && records.length > 0 && (
        <>
          {filteredRecords.length > 0 ? (
            <>
              <PaginationControls
                page={page}
                pageCount={pageCount}
                rowCount={filteredRecords.length}
                onPageChange={setCurrentPage}
              />
              <DataTable rows={pageRecords} />
            </>
          ) : <p>No records match the selected filters.</p>}
        </>
      )}
    </div>
  )
}
