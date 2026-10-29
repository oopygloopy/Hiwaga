import { formatCell, getColumns, shortenName } from './utils/formatters'

export default function DataTable({
  rows = [],
  columns: visibleColumns,
  excludeColumns = [],
  sort,
  onSort,
  rowActions,
}) {
  const columns = visibleColumns ?? getColumns(rows, excludeColumns)

  return (
    <div className="records-table-wrapper">
      <table className="records-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const isCurrentSort = sort?.column === column
              const sortIcon = isCurrentSort ? (sort.direction === 1 ? ' ▲' : ' ▼') : ''

              if (onSort) {
                return (
                  <th
                    key={column}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => onSort(column)}
                    aria-sort={isCurrentSort ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}
                  >
                    <span>{column}</span>
                    <span style={{ fontSize: '11px', marginLeft: '4px', opacity: isCurrentSort ? 1 : 0.4 }}>
                      {isCurrentSort ? sortIcon : '↕'}
                    </span>
                  </th>
                )
              }

              return <th key={column}>{column}</th>
            })}
            {rowActions && (
              <th className="records-table-actions-header">
                <span>Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(1, columns.length + (rowActions ? 1 : 0))} className="records-table-empty">
                No entries to display.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              if (row._placeholder) {
                return (
                  <tr key={row.id ?? `placeholder-${index}`} aria-hidden="true">
                    <td
                      colSpan={Math.max(1, columns.length + (rowActions ? 1 : 0))}
                      style={{ color: 'var(--text-muted, #aaa)', fontStyle: 'italic', textAlign: 'center' }}
                    >
                      No record
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={row.record_id ?? row.id ?? index}>
                  {columns.map((column) => {
                    const value = row[column]
                    if (column === 'Score' || column === 'Grade') {
                      const num = typeof value === 'number' ? value : Number.parseFloat(String(value).replace('%', ''))
                      if (Number.isFinite(num)) {
                        const color = num >= 75 ? '#2f9e44' : num >= 50 ? '#d97706' : '#e03131'
                        const label = Number.isFinite(row.rawCorrect) && Number.isFinite(row.rawTotal)
                          ? `${row.rawCorrect}/${row.rawTotal} (${num.toFixed(1)}%)`
                          : `${num.toFixed(1)}%`
                        return (
                          <td key={column}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontWeight: 600,
                                fontSize: '14px',
                                color,
                                background: `${color}18`,
                                border: `1px solid ${color}40`,
                              }}
                            >
                              {label}
                            </span>
                          </td>
                        )
                      }
                    }
                    if (column === 'Name' || column === 'Student') {
                      const fullName = formatCell(value)
                      const shortName = row._shortName || shortenName(fullName)
                      if (shortName && shortName !== fullName) {
                        return (
                          <td key={column} title={fullName}>
                            <span className="name-full">{fullName}</span>
                            <span className="name-short">{shortName}</span>
                          </td>
                        )
                      }
                    }
                    return <td key={column}>{formatCell(value)}</td>
                  })}
                  {rowActions && (
                    <td className="records-table-actions-cell">
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
