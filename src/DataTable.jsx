import { formatCell, getColumns } from './utils/formatters'

export default function DataTable({ rows = [], columns: visibleColumns, excludeColumns = [] }) {
  const columns = visibleColumns ?? getColumns(rows, excludeColumns)

  return (
    <div className="records-table-wrapper">
      <table className="records-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(1, columns.length)} className="records-table-empty">
                No entries to display.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.record_id ?? row.id ?? index}>
                {columns.map((column) => {
                  const value = row[column]
                  if (column === 'Score' || column === 'Grade') {
                    const num = typeof value === 'number' ? value : Number.parseFloat(String(value).replace('%', ''))
                    if (Number.isFinite(num)) {
                      const color = num >= 75 ? '#2f9e44' : num >= 50 ? '#d97706' : '#e03131'
                      return (
                        <td key={column}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: 600,
                              fontSize: '12px',
                              color,
                              background: `${color}18`,
                              border: `1px solid ${color}40`,
                            }}
                          >
                            {num.toFixed(1)}%
                          </span>
                        </td>
                      )
                    }
                  }
                  return <td key={column}>{formatCell(value)}</td>
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
