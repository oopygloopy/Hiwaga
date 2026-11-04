import { useState, useEffect } from 'react'
import { supabase } from './utils/supabase'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'
import editIcon from './assets/edit.svg'
import archiveIcon from './assets/archive.svg'
import restoreIcon from './assets/restore.svg'

export default function Sections({ onSectionsChange }) {
  const [sections, setSections] = useState([])
  const [studentCounts, setStudentCounts] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [currentPage, setCurrentPage] = useState(1)
  const [sort] = useState({ column: 'Section Name', direction: 1 })
  const [refreshKey, setRefreshKey] = useState(0)

  // Modal dialog state: '' | 'add' | 'edit' | 'archive' | 'restore'
  const [dialog, setDialog] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [newSchoolYear, setNewSchoolYear] = useState('')
  const [editSectionId, setEditSectionId] = useState('')
  const [editSectionName, setEditSectionName] = useState('')
  const [editSchoolYear, setEditSchoolYear] = useState('')
  const [archiveSectionId, setArchiveSectionId] = useState('')
  const [isArchiveConfirmed, setIsArchiveConfirmed] = useState(false)
  const [restoreSectionId, setRestoreSectionId] = useState('')
  const [isRestoreConfirmed, setIsRestoreConfirmed] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [isMutating, setIsMutating] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [sectionsRes, profilesRes] = await Promise.all([
          supabase.from('sections').select('id, section_name, school_year, archived_at'),
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
    setNewSchoolYear('')
    setEditSectionId('')
    setEditSectionName('')
    setEditSchoolYear('')
    setArchiveSectionId('')
    setIsArchiveConfirmed(false)
    setRestoreSectionId('')
    setIsRestoreConfirmed(false)
    setMutationError('')
  }

  const schoolYearRegex = /^\d{4}-\d{4}$/

  const handleAddSection = async (event) => {
    event.preventDefault()
    setMutationError('')

    if (!newSectionName.trim()) {
      setMutationError('Section name cannot be empty.')
      return
    }

    const trimmedYear = newSchoolYear.trim()
    if (!trimmedYear) {
      setMutationError('School year cannot be empty.')
      return
    }
    if (!schoolYearRegex.test(trimmedYear)) {
      setMutationError('School year must be in format YYYY-YYYY (e.g. 2024-2025).')
      return
    }

    const trimmed = `Grade 5 - ${newSectionName.trim()}`

    const exists = sections.some(
      (s) => s.section_name.toLowerCase() === trimmed.toLowerCase() && (s.school_year || '').trim() === trimmedYear,
    )
    if (exists) {
      setMutationError('A section with this name and school year already exists.')
      return
    }

    setIsMutating(true)
    try {
      const { error: insertError } = await supabase
        .from('sections')
        .insert([{ section_name: trimmed, school_year: trimmedYear }])
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

    if (!editSectionName.trim()) {
      setMutationError('Section name cannot be empty.')
      return
    }

    const trimmedYear = editSchoolYear.trim()
    if (!trimmedYear) {
      setMutationError('School year cannot be empty.')
      return
    }
    if (!schoolYearRegex.test(trimmedYear)) {
      setMutationError('School year must be in format YYYY-YYYY (e.g. 2024-2025).')
      return
    }

    const trimmed = `Grade 5 - ${editSectionName.trim()}`

    const duplicate = sections.some(
      (s) =>
        String(s.id) !== String(editSectionId) &&
        s.section_name.toLowerCase() === trimmed.toLowerCase() &&
        (s.school_year || '').trim() === trimmedYear,
    )
    if (duplicate) {
      setMutationError('A section with this name and school year already exists.')
      return
    }

    setIsMutating(true)
    try {
      const { error: updateError } = await supabase
        .from('sections')
        .update({ section_name: trimmed, school_year: trimmedYear })
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

  const handleArchiveSection = async (event) => {
    event.preventDefault()
    setMutationError('')

    if (!archiveSectionId) {
      setMutationError('Select a section to archive.')
      return
    }

    if (!isArchiveConfirmed) {
      setMutationError('Please confirm that you want to archive this section.')
      return
    }

    setIsMutating(true)
    try {
      const { error: archiveError } = await supabase
        .from('sections')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', archiveSectionId)

      if (archiveError) throw archiveError

      setRefreshKey((k) => k + 1)
      onSectionsChange?.()
      closeDialog()
    } catch (err) {
      setMutationError(err?.message || 'Unable to archive section.')
    } finally {
      setIsMutating(false)
    }
  }

  const handleRestoreSection = async (event) => {
    event.preventDefault()
    setMutationError('')

    if (!restoreSectionId) {
      setMutationError('Select a section to restore.')
      return
    }

    if (!isRestoreConfirmed) {
      setMutationError('Please confirm that you want to restore this section.')
      return
    }

    setIsMutating(true)
    try {
      const { error: restoreError } = await supabase
        .from('sections')
        .update({ archived_at: null })
        .eq('id', restoreSectionId)

      if (restoreError) throw restoreError

      setRefreshKey((k) => k + 1)
      onSectionsChange?.()
      closeDialog()
    } catch (err) {
      setMutationError(err?.message || 'Unable to restore section.')
    } finally {
      setIsMutating(false)
    }
  }

  const filteredSections = sections.filter((s) => {
    const isArchived = Boolean(s.archived_at)
    if (statusFilter === 'active' && isArchived) return false
    if (statusFilter === 'archived' && !isArchived) return false

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const matchName = s.section_name.toLowerCase().includes(q)
      const matchYear = String(s.school_year || '').toLowerCase().includes(q)
      if (!matchName && !matchYear) return false
    }
    return true
  })

  const sortedSections = [...filteredSections].sort((a, b) => {
    if (sort.column === 'Enrolled Students') {
      const countA = studentCounts[a.id] || 0
      const countB = studentCounts[b.id] || 0
      return (countA - countB) * sort.direction
    }
    if (sort.column === 'School Year') {
      return String(a.school_year || '').localeCompare(String(b.school_year || '')) * sort.direction
    }
    return String(a.section_name || '').localeCompare(String(b.section_name || '')) * sort.direction
  })

  const pageCount = Math.max(1, Math.ceil(sortedSections.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageSections = sortedSections.slice((page - 1) * 10, page * 10)

  const tableRows = pageSections.map((s) => ({
    id: s.id,
    _sectionId: s.id,
    _sectionName: s.section_name,
    _schoolYear: s.school_year || '',
    'Section Name': s.section_name,
    'School Year': s.school_year || '—',
    'Enrolled Students': studentCounts[s.id] || 0,
  }))

  const selectedEditSection = sections.find((s) => String(s.id) === String(editSectionId))
  const selectedArchiveSection = sections.find((s) => String(s.id) === String(archiveSectionId))
  const selectedRestoreSection = sections.find((s) => String(s.id) === String(restoreSectionId))
  const archiveCount = selectedArchiveSection ? studentCounts[selectedArchiveSection.id] || 0 : 0

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
              setNewSchoolYear('')
              setDialog('add')
            }}
          >
            Add section
          </button>
        </div>
      </div>

      <div className="overall-stats-controls">
        <label htmlFor="sections-status-filter">Status</label>
        <select
          id="sections-status-filter"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setCurrentPage(1)
          }}
          style={{
            padding: '9px 13px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text)',
            background: 'var(--code-bg)',
            font: 'inherit',
            fontSize: '15px',
          }}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>

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
        <p>No {statusFilter} sections found matching &quot;{searchQuery}&quot;.</p>
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
            columns={['Section Name', 'School Year', 'Enrolled Students']}
            rowActions={(row) => (
              <div className="row-actions">
                {statusFilter === 'active' ? (
                  <>
                    <button
                      type="button"
                      className="row-action-btn row-action-edit"
                      title="Edit section"
                      aria-label={`Edit ${row['Section Name']}`}
                      onClick={() => {
                        setMutationError('')
                        setEditSectionId(String(row._sectionId))
                        // Strip the auto-prefix so the field shows only the bare name
                        const bare = row._sectionName.startsWith('Grade 5 - ')
                          ? row._sectionName.slice('Grade 5 - '.length)
                          : row._sectionName
                        setEditSectionName(bare)
                        setEditSchoolYear(row._schoolYear || '')
                        setDialog('edit')
                      }}
                    >
                      <img src={editIcon} alt="" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="row-action-btn row-action-archive"
                      title="Archive section"
                      aria-label={`Archive ${row['Section Name']}`}
                      onClick={() => {
                        setMutationError('')
                        setArchiveSectionId(String(row._sectionId))
                        setIsArchiveConfirmed(false)
                        setDialog('archive')
                      }}
                    >
                      <img src={archiveIcon} alt="" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="row-action-btn row-action-restore"
                    title="Restore section"
                    aria-label={`Restore ${row['Section Name']}`}
                    onClick={() => {
                      setMutationError('')
                      setRestoreSectionId(String(row._sectionId))
                      setIsRestoreConfirmed(false)
                      setDialog('restore')
                    }}
                  >
                    <img src={restoreIcon} alt="" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ whiteSpace: 'nowrap', color: 'var(--text)', fontSize: '15px' }}>Grade 5 -</span>
                  <input
                    id="new-section-name"
                    type="text"
                    placeholder="e.g. Diamond"
                    value={newSectionName}
                    onChange={(event) => setNewSectionName(event.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="new-school-year">School year</label>
                <input
                  id="new-school-year"
                  type="text"
                  placeholder="e.g. 2024-2025"
                  pattern="\d{4}-\d{4}"
                  title="Format: YYYY-YYYY (e.g. 2024-2025)"
                  value={newSchoolYear}
                  onChange={(event) => setNewSchoolYear(event.target.value)}
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
              <h2 id="edit-section-title">Edit {selectedEditSection?.section_name || 'section'}</h2>
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
              <div className="field-group">
                <label htmlFor="edit-section-name">New section name</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ whiteSpace: 'nowrap', color: 'var(--text)', fontSize: '15px' }}>Grade 5 -</span>
                  <input
                    id="edit-section-name"
                    type="text"
                    placeholder="Enter section name"
                    value={editSectionName}
                    onChange={(event) => setEditSectionName(event.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="edit-school-year">School year</label>
                <input
                  id="edit-school-year"
                  type="text"
                  placeholder="e.g. 2024-2025"
                  pattern="\d{4}-\d{4}"
                  title="Format: YYYY-YYYY (e.g. 2024-2025)"
                  value={editSchoolYear}
                  onChange={(event) => setEditSchoolYear(event.target.value)}
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

      {dialog === 'archive' && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutating) closeDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isMutating) closeDialog()
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="archive-section-title">
            <header className="add-user-dialog-header">
              <h2 id="archive-section-title">Archive {selectedArchiveSection?.section_name || 'section'}</h2>
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
            <form className="add-user-form" onSubmit={handleArchiveSection}>
              {archiveSectionId && archiveCount > 0 && (
                <div className="delete-user-warning">
                  <strong>Notice:</strong> {archiveCount} student(s) currently belong to this section. Archiving it will preserve their records while hiding this section from active assignments.
                </div>
              )}

              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isArchiveConfirmed}
                  onChange={(event) => setIsArchiveConfirmed(event.target.checked)}
                />
                I understand this section will be archived.
              </label>

              {mutationError && <p className="add-user-error" role="alert">{mutationError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isMutating} onClick={closeDialog}>
                  Cancel
                </button>
                <button
                  className="delete-user-confirm-button"
                  type="submit"
                  disabled={isMutating || !isArchiveConfirmed || !archiveSectionId}
                >
                  {isMutating ? 'Archiving section...' : 'Archive section'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {dialog === 'restore' && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutating) closeDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isMutating) closeDialog()
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="restore-section-title">
            <header className="add-user-dialog-header">
              <h2 id="restore-section-title">Restore {selectedRestoreSection?.section_name || 'section'}</h2>
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
            <form className="add-user-form" onSubmit={handleRestoreSection}>
              <div className="delete-user-warning" style={{ borderColor: '#2f9e44', background: 'rgba(47, 158, 68, 0.08)' }}>
                Restoring this section will reactivate it and make it available for student and teacher assignments again.
              </div>

              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isRestoreConfirmed}
                  onChange={(event) => setIsRestoreConfirmed(event.target.checked)}
                />
                I confirm that I want to restore this section.
              </label>

              {mutationError && <p className="add-user-error" role="alert">{mutationError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isMutating} onClick={closeDialog}>
                  Cancel
                </button>
                <button
                  className="delete-user-confirm-button"
                  type="submit"
                  style={{ background: '#2f9e44', borderColor: '#2f9e44' }}
                  disabled={isMutating || !isRestoreConfirmed || !restoreSectionId}
                >
                  {isMutating ? 'Restoring section...' : 'Restore section'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
