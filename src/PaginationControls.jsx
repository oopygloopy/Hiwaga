export default function PaginationControls({ page, pageCount, rowCount, onPageChange }) {
  const firstRow = rowCount === 0 ? 0 : (page - 1) * 10 + 1
  const lastRow = Math.min(page * 10, rowCount)

  return (
    <nav className="table-pagination" aria-label="Table pagination">
      <span>Showing {firstRow}-{lastRow} of {rowCount}</span>
      <div className="table-pagination-actions">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span aria-live="polite">Page {page} of {pageCount}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          Next
        </button>
      </div>
    </nav>
  )
}