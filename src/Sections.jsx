import { useState, useEffect } from 'react'
import { supabase } from './utils/supabase'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'

export default function Sections({ onSectionsChange }) {
  const [sections, setSections] = useState([])
  const [studentCounts, setStudentCounts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sort, setSort] = useState({ column: 'Section Name', direction: 1 })
  const [refreshKey, setRefreshKey] = useState(0)

  // Modal dialog state: '' | 'add' | 'edit' | 'delete'
  const [dialog, setDialog] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [editSectionId, setEditSectionId] = useState('')
  const [editSectionName, setEditSectionName] = useState('')
  const [deleteSectionId, setDeleteSectionId] = useState('')
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [isMutating, setIsMutating] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [sectionsRes, profilesRes] = await Promise.all([
          supabase.from('sections').select('id, section_name'),
          supabase.from('profiles').select('section'),
        ])

        if (!isMounted) return

        if (sectionsRes.error) throw sectionsRes.error

        const rawSections = (sectionsRes.data ?? [])
          .filter(({ id, section_name }) => id !== null && id !== undefined && section_name !== null && String(section_name).trim() !== '')
          .sort((a, b) => String(a.section_name).localeCompare(String(b.section_name)))

        setSections(rawSections)

        // Count students per section
        const counts = {}
        if (profilesRes.data) {
          for (const profile of profilesRes.data) {
            if (profile.section) {
              counts[profile.section] = (counts[profile.section] || 0) + 1
            }
          }
        }
        setStudentCounts(counts)
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Unable to load sections.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [refreshKey])

  const closeDialog = () => {
    if (isMutating) return
    setDialog('')
    setNewSectionName('')
    setEditSectionId('')
    setEditSectionName('')
    setDeleteSectionId('')
    setIsDeleteConfirmed(false)
    setMutationError('')
  }

  const handleSortChange = (column) => {
    setSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 1 ? -1 : 1 }
      }
      return { column, direction: 1 }
    })
    setCurrentPage(1)
  }

  const handleAddSection = async (event) => {
    event.preventDefault()
    setMutationError('')

    const trimmed = newSectionName.trim()
    if (!trimmed) {
      setMutationError('Section name cannot be empty.')
      return
    }

    const exists = sections.some((s) => s.section_name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setMutationError('A section with this name already exists.')
      return
    }

    setIsMutating(true)
    try {
      const { error: insertError } = await supabase.from('sections').insert([{ section_name: trimmed }])
      if (insertError) throw insertError

      setRefreshKey((k) => k + 1)
      onSectionsChange?.()
      closeDialog()
    } catch (err) {
      setMutationError(err?.message || 'Unable to add section.')
    } finally {
      setIsMutating(false)
    }
  }

  const handleEditSection = async (event) => {
    event.preventDefault()
    setMutationError('')

    if (!editSectionId) {
      setMutationError('Select a section to edit.')
      return
    }

    const trimmed = editSectionName.trim()
    if (!trimmed) {
      setMutationError('Section name cannot be empty.')
      return
    }

    const duplicate = sections.some(
      (s) => String(s.id) !== String(editSectionId) && s.section_name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicate) {
      setMutationError('A section with this name already exists.')
      return
    }

    setIsMutating(true)
    try {
      const { error: updateError } = await supabase
        .from('sections')
        .update({ section_name: trimmed })
        .eq('id', editSectionId)

      if (updateError) throw updateError

      setRefreshKey((k) => k + 1)
      onSectionsChange?.()
      closeDialog()
    } catch (err) {
      setMutationError(err?.message || 'Unable to update section.')
    } finally {
      setIsMutating(false)
    }
  }

  const handleDeleteSection = async (event) => {
    event.preventDefault()
    setMutationError('')

    if (!deleteSectionId) {
      setMutationError('Select a section to delete.')
      return
    }

    if (!isDeleteConfirmed) {
      setMutationError('Please confirm the permanent deletion.')
      return
    }

    setIsMutating(true)
    try {
      const { error: deleteError } = await supabase.from('sections').delete().eq('id', deleteSectionId)
      if (deleteError) {
        if (deleteError.message?.toLowerCase().includes('foreign key') || deleteError.code === '23503') {
          throw new Error('Cannot delete this section because students or teachers are still assigned to it. Reassign them first.')
        }
        throw deleteError
      }

      setRefreshKey((k) => k + 1)
      onSectionsChange?.()
      closeDialog()
    } catch (err) {
      setMutationError(err?.message || 'Unable to delete section.')
    } finally {
      setIsMutating(false)
    }
  }

  const filteredSections = searchQuery.trim()
    ? sections.filter((s) => s.section_name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : sections

  const sortedSections = [...filteredSections].sort((a, b) => {
    if (sort.column === 'Enrolled Students') {
      const countA = studentCounts[a.id] || 0
      const countB = studentCounts[b.id] || 0
      return (countA - countB) * sort.direction
    }
    return String(a.section_name || '').localeCompare(String(b.section_name || '')) * sort.direction
  })

  const pageCount = Math.max(1, Math.ceil(sortedSections.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageSections = sortedSections.slice((page - 1) * 10, page * 10)

  const tableRows = pageSections.map((s) => ({
    id: s.id,
    'Section Name': s.section_name,
    'Enrolled Students': studentCounts[s.id] || 0,
  }))

  const selectedDeleteSection = sections.find((s) => String(s.id) === String(deleteSectionId))
  const deleteCount = selectedDeleteSection ? studentCounts[selectedDeleteSection.id] || 0 : 0

  return (
    <div className="dashboard-content">
      <p className="view-hint">Manage school class sections for student and teacher assignments.</p>

      <div className="management-toolbar">
        <div className="user-management-actions">
          <button
            className="add-user-button"
            type="button"
            onClick={() => {
              setMutationError('')
              setNewSectionName('')
              setDialog('add')
            }}
          >
            Add section
          </button>
          <button
            className="add-user-button"
            type="button"
            onClick={() => {
              setMutationError('')
              setEditSectionId('')
              setEditSectionName('')
              setDialog('edit')
            }}
          >
            Edit section
          </button>
          <button
            className="delete-user-button"
            type="button"
            onClick={() => {
              setMutationError('')
              setDeleteSectionId('')
              setIsDeleteConfirmed(false)
              setDialog('delete')
            }}
          >
            Delete section
          </button>
        </div>
      </div>

      <div className="overall-stats-controls">
        <label htmlFor="sections-search-input">Search</label>
        <input
          id="sections-search-input"
          type="search"
          placeholder="Filter sections..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setCurrentPage(1)
          }}
          style={{
            maxWidth: 'min(240px, 55vw)',
            padding: '9px 13px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text)',
            background: 'var(--code-bg)',
            font: 'inherit',
            fontSize: '15px',
          }}
        />
      </div>

      {isLoading && <p>Loading sections...</p>}
      {error && <p className="records-error" role="alert">Unable to load sections: {error}</p>}
      {!isLoading && !error && sections.length === 0 && <p>No sections found.</p>}
      {!isLoading && !error && sections.length > 0 && filteredSections.length === 0 && (
        <p>No sections found matching &quot;{searchQuery}&quot;.</p>
      )}

      {!isLoading && !error && filteredSections.length > 0 && (
        <>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={filteredSections.length}
            onPageChange={setCurrentPage}
          />
          <DataTable
            rows={tableRows}
            columns={['Section Name', 'Enrolled Students']}
            sort={sort}
            onSort={handleSortChange}
          />
        </>
      )}

      {dialog === 'add' && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutating) closeDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isMutating) closeDialog()
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="add-section-title">
            <header className="add-user-dialog-header">
              <h2 id="add-section-title">Add section</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isMutating}
                onClick={closeDialog}
              >
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleAddSection}>
              <div className="field-group">
                <label htmlFor="new-section-name">Section name</label>
                <input
                  id="new-section-name"
                  type="text"
                  placeholder="e.g. Grade 5 - Diamond"
                  value={newSectionName}
                  onChange={(event) => setNewSectionName(event.target.value)}
                  required
                />
              </div>
              {mutationError && <p className="add-user-error" role="alert">{mutationError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isMutating} onClick={closeDialog}>
                  Cancel
                </button>
                <button type="submit" disabled={isMutating}>
                  {isMutating ? 'Adding section...' : 'Add section'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {dialog === 'edit' && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutating) closeDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isMutating) closeDialog()
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-section-title">
            <header className="add-user-dialog-header">
              <h2 id="edit-section-title">Edit section</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isMutating}
                onClick={closeDialog}
              >
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleEditSection}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="edit-section-select">Select section</label>
                <select
                  id="edit-section-select"
                  value={editSectionId}
                  onChange={(event) => {
                    const secId = event.target.value
                    setEditSectionId(secId)
                    const found = sections.find((s) => String(s.id) === String(secId))
                    setEditSectionName(found ? found.section_name : '')
                  }}
                  required
                >
                  <option value="" disabled>Choose a section</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.section_name}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="edit-section-name">New section name</label>
                <input
                  id="edit-section-name"
                  type="text"
                  placeholder="Enter new section name"
                  value={editSectionName}
                  onChange={(event) => setEditSectionName(event.target.value)}
                  required
                />
              </div>
              {mutationError && <p className="add-user-error" role="alert">{mutationError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isMutating} onClick={closeDialog}>
                  Cancel
                </button>
                <button type="submit" disabled={isMutating}>
                  {isMutating ? 'Saving changes...' : 'Save changes'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {dialog === 'delete' && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutating) closeDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isMutating) closeDialog()
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-section-title">
            <header className="add-user-dialog-header">
              <h2 id="delete-section-title">Delete section</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isMutating}
                onClick={closeDialog}
              >
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleDeleteSection}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="delete-section-select">Select section</label>
                <select
                  id="delete-section-select"
                  value={deleteSectionId}
                  onChange={(event) => {
                    setDeleteSectionId(event.target.value)
                    setIsDeleteConfirmed(false)
                  }}
                  required
                >
                  <option value="" disabled>Choose a section</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.section_name}</option>
                  ))}
                </select>
              </div>

              {deleteSectionId && deleteCount > 0 && (
                <div className="delete-user-warning">
                  <strong>Warning:</strong> {deleteCount} student(s) currently belong to this section. Deleting it may cause database errors or leave students unassigned.
                </div>
              )}

              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isDeleteConfirmed}
                  onChange={(event) => setIsDeleteConfirmed(event.target.checked)}
                />
                I understand this action is permanent and cannot be undone.
              </label>

              {mutationError && <p className="add-user-error" role="alert">{mutationError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isMutating} onClick={closeDialog}>
                  Cancel
                </button>
                <button
                  className="delete-user-confirm-button"
                  type="submit"
                  disabled={isMutating || !isDeleteConfirmed || !deleteSectionId}
                >
                  {isMutating ? 'Deleting section...' : 'Permanently delete section'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
