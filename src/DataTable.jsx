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

export default function DataTable({ rows, columns: visibleColumns }) {
  const columns = visibleColumns ?? getColumns(rows).filter((column) => column !== 'Grade')

  return (
    <div className="records-table-wrapper">
      <table className="records-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}