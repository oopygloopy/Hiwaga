import { useState } from 'react'
import PaginationControls from './PaginationControls.jsx'

const formatCell = (value) => {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

const getProfileUuid = (profile) => profile.uuid ?? profile.user_id ?? profile.id

const getProfileLabel = (profile) => {
  const firstName = profile.first_name?.trim()
  const lastName = profile.last_name?.trim()
  const middleInitial = profile.middle_name?.trim()?.[0]
  const name = [lastName, firstName && `${firstName}${middleInitial ? ` ${middleInitial}.` : ''}`]
    .filter(Boolean)
    .join(', ')

  return name || String(getProfileUuid(profile))
}

function DataTable({ rows }) {
  const columns = rows.reduce((allColumns, row) => {
    Object.keys(row).forEach((column) => {
      if (!allColumns.includes(column)) {
        allColumns.push(column)
      }
    })
    return allColumns
  }, [])

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

export default function Students({
  students,
  filteredStudents,
  sections,
  selectedSection,
  setSelectedSection,
  isStudentsLoading,
  studentsError,
  profiles,
  newStudent,
  setNewStudent,
  isAddStudentOpen,
  setIsAddStudentOpen,
  isCreatingStudent,
  createStudentError,
  setCreateStudentError,
  handleCreateStudent,
  isEditStudentOpen,
  setIsEditStudentOpen,
  selectedProfileUuid,
  setSelectedProfileUuid,
  editStudentFields,
  setEditStudentFields,
  isUpdatingStudent,
  updateStudentError,
  setUpdateStudentError,
  handleUpdateStudent,
  isDeleteStudentOpen,
  setIsDeleteStudentOpen,
  selectedDeleteProfileUuid,
  setSelectedDeleteProfileUuid,
  isDeleteConfirmed,
  setIsDeleteConfirmed,
  isDeletingStudent,
  deleteStudentError,
  setDeleteStudentError,
  handleDeleteStudent,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const manageableProfiles = profiles.filter((profile) => !String(profile.role ?? '').toLowerCase().includes('teacher'))
  const sortedStudents = [...filteredStudents].sort((firstStudent, secondStudent) =>
    String(firstStudent.Name ?? '').localeCompare(String(secondStudent.Name ?? ''), undefined, {
      sensitivity: 'base',
      numeric: true,
    }),
  )
  const pageCount = Math.max(1, Math.ceil(sortedStudents.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageStudents = sortedStudents.slice((page - 1) * 10, page * 10)

  return (
    <div className="dashboard-content">
      <p className="view-hint">Lists the name, section, and the last activity of every student.</p>
      <div className="management-toolbar">
        <div className="overall-stats-controls">
          <label htmlFor="students-section-filter">Section</label>
          <select
            id="students-section-filter"
            value={selectedSection}
            onChange={(event) => {
              setSelectedSection(event.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">All sections</option>
            {sections.map(({ id, section_name }) => (
              <option key={id} value={section_name}>{section_name}</option>
            ))}
          </select>
        </div>
        <div className="user-management-actions">
          <button className="add-user-button" type="button" onClick={() => {
            setCreateStudentError('')
            setIsAddStudentOpen(true)
          }}>
            Add student
          </button>
          <button className="add-user-button" type="button" onClick={() => {
            setUpdateStudentError('')
            setSelectedProfileUuid('')
            setEditStudentFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
            setIsEditStudentOpen(true)
          }}>
            Edit student
          </button>
          <button className="delete-user-button" type="button" onClick={() => {
            setDeleteStudentError('')
            setSelectedDeleteProfileUuid('')
            setIsDeleteConfirmed(false)
            setIsDeleteStudentOpen(true)
          }}>
            Delete student
          </button>
        </div>
      </div>
      {isStudentsLoading && <p>Loading students...</p>}
      {studentsError && <p className="records-error" role="alert">Unable to load students: {studentsError}</p>}
      {!isStudentsLoading && !studentsError && students.length === 0 && <p>No students found.</p>}
      {!isStudentsLoading && !studentsError && students.length > 0 && filteredStudents.length === 0 && <p>No students found in this section.</p>}
      {!isStudentsLoading && !studentsError && filteredStudents.length > 0 && (
        <>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={filteredStudents.length}
            onPageChange={setCurrentPage}
          />
          <DataTable rows={pageStudents} />
        </>
      )}
      {isAddStudentOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreatingStudent) setIsAddStudentOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isCreatingStudent) setIsAddStudentOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="add-student-title">
            <header className="add-user-dialog-header">
              <h2 id="add-student-title">Add student</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isCreatingStudent}
                onClick={() => setIsAddStudentOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleCreateStudent}>
              <div className="field-group">
                <label htmlFor="new-student-email">Email</label>
                <input
                  id="new-student-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={newStudent.email}
                  onChange={(event) => setNewStudent({ ...newStudent, email: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-student-password">Password</label>
                <input
                  id="new-student-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={newStudent.password}
                  onChange={(event) => setNewStudent({ ...newStudent, password: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-student-first-name">First name</label>
                <input
                  id="new-student-first-name"
                  name="first_name"
                  autoComplete="given-name"
                  value={newStudent.first_name}
                  onChange={(event) => setNewStudent({ ...newStudent, first_name: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-student-last-name">Last name</label>
                <input
                  id="new-student-last-name"
                  name="last_name"
                  autoComplete="family-name"
                  value={newStudent.last_name}
                  onChange={(event) => setNewStudent({ ...newStudent, last_name: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-student-middle-name">Middle name</label>
                <input
                  id="new-student-middle-name"
                  name="middle_name"
                  autoComplete="additional-name"
                  value={newStudent.middle_name}
                  onChange={(event) => setNewStudent({ ...newStudent, middle_name: event.target.value })}
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-student-section">Section</label>
                <select
                  id="new-student-section"
                  name="section"
                  value={newStudent.section}
                  onChange={(event) => setNewStudent({ ...newStudent, section: event.target.value })}
                  required
                >
                  <option value="" disabled>Select a section</option>
                  {sections.map(({ id, section_name }) => (
                    <option key={id} value={id}>{section_name}</option>
                  ))}
                </select>
              </div>
              {createStudentError && <p className="add-user-error" role="alert">{createStudentError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isCreatingStudent} onClick={() => setIsAddStudentOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isCreatingStudent || sections.length === 0}>
                  {isCreatingStudent ? 'Adding...' : 'Add student'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {isEditStudentOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUpdatingStudent) setIsEditStudentOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isUpdatingStudent) setIsEditStudentOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-student-title">
            <header className="add-user-dialog-header">
              <h2 id="edit-student-title">Edit student</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isUpdatingStudent}
                onClick={() => setIsEditStudentOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleUpdateStudent}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="edit-student-profile">Student</label>
                <select
                  id="edit-student-profile"
                  value={selectedProfileUuid}
                  onChange={(event) => setSelectedProfileUuid(event.target.value)}
                  required
                >
                  <option value="" disabled>Select a student</option>
                  {manageableProfiles.map((profile) => {
                    const uuid = String(getProfileUuid(profile))
                    return <option key={uuid} value={uuid}>{getProfileLabel(profile)}</option>
                  })}
                </select>
              </div>
              {[
                ['email', 'Email', 'email'],
                ['password', 'Password', 'password'],
                ['first_name', 'First name', 'text'],
                ['last_name', 'Last name', 'text'],
                ['middle_name', 'Middle name', 'text'],
              ].map(([field, label, type]) => (
                <div className="field-group" key={field}>
                  <label htmlFor={`edit-student-${field}`}>{label}</label>
                  <input
                    id={`edit-student-${field}`}
                    type={type}
                    autoComplete={field === 'password' ? 'new-password' : 'off'}
                    placeholder="Leave unchanged"
                    value={editStudentFields[field]}
                    onChange={(event) => setEditStudentFields({ ...editStudentFields, [field]: event.target.value })}
                  />
                </div>
              ))}
              <div className="field-group">
                <label htmlFor="edit-student-section">Section</label>
                <select
                  id="edit-student-section"
                  value={editStudentFields.section}
                  onChange={(event) => setEditStudentFields({ ...editStudentFields, section: event.target.value })}
                >
                  <option value="">Leave unchanged</option>
                  {sections.map(({ id, section_name }) => (
                    <option key={id} value={id}>{section_name}</option>
                  ))}
                </select>
              </div>
              {updateStudentError && <p className="add-user-error" role="alert">{updateStudentError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isUpdatingStudent} onClick={() => setIsEditStudentOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingStudent || manageableProfiles.length === 0}>
                  {isUpdatingStudent ? 'Saving...' : 'Save changes'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {isDeleteStudentOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeletingStudent) setIsDeleteStudentOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isDeletingStudent) setIsDeleteStudentOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-student-title">
            <header className="add-user-dialog-header">
              <h2 id="delete-student-title">Delete student</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isDeletingStudent}
                onClick={() => setIsDeleteStudentOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleDeleteStudent}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="delete-student-profile">Student</label>
                <select
                  id="delete-student-profile"
                  value={selectedDeleteProfileUuid}
                  onChange={(event) => {
                    setSelectedDeleteProfileUuid(event.target.value)
                    setIsDeleteConfirmed(false)
                    setDeleteStudentError('')
                  }}
                  required
                >
                  <option value="" disabled>Select a student</option>
                  {manageableProfiles.map((profile) => {
                    const uuid = String(getProfileUuid(profile))
                    return <option key={uuid} value={uuid}>{getProfileLabel(profile)}</option>
                  })}
                </select>
              </div>
              {selectedDeleteProfileUuid && (
                <p className="delete-user-warning">
                  This permanently deletes {getProfileLabel(profiles.find((profile) => String(getProfileUuid(profile)) === selectedDeleteProfileUuid) ?? {})} and cannot be undone.
                </p>
              )}
              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isDeleteConfirmed}
                  onChange={(event) => setIsDeleteConfirmed(event.target.checked)}
                />
                <span>I understand this action is permanent.</span>
              </label>
              {deleteStudentError && <p className="add-user-error" role="alert">{deleteStudentError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isDeletingStudent} onClick={() => setIsDeleteStudentOpen(false)}>
                  Cancel
                </button>
                <button className="delete-user-confirm-button" type="submit" disabled={isDeletingStudent || !isDeleteConfirmed}>
                  {isDeletingStudent ? 'Deleting...' : 'Delete permanently'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
