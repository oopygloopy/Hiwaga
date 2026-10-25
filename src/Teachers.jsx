import { useState } from 'react'
import PaginationControls from './PaginationControls.jsx'

const formatCell = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
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
      if (!allColumns.includes(column)) allColumns.push(column)
    })
    return allColumns
  }, [])

  return (
    <div className="records-table-wrapper">
      <table className="records-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
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

export default function Teachers({
  users,
  filteredUsers,
  sections,
  isUsersLoading,
  usersError,
  profiles,
  newUser,
  setNewUser,
  isAddUserOpen,
  setIsAddUserOpen,
  isCreatingUser,
  createUserError,
  setCreateUserError,
  handleCreateUser,
  isEditUserOpen,
  setIsEditUserOpen,
  selectedProfileUuid,
  setSelectedProfileUuid,
  editUserFields,
  setEditUserFields,
  isUpdatingUser,
  updateUserError,
  setUpdateUserError,
  handleUpdateUser,
  isDeleteUserOpen,
  setIsDeleteUserOpen,
  selectedDeleteProfileUuid,
  setSelectedDeleteProfileUuid,
  isDeleteConfirmed,
  setIsDeleteConfirmed,
  isDeletingUser,
  deleteUserError,
  setDeleteUserError,
  handleDeleteUser,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const manageableProfiles = profiles
  const sortedTeachers = [...filteredUsers].sort((firstTeacher, secondTeacher) =>
    String(firstTeacher.Name ?? '').localeCompare(String(secondTeacher.Name ?? ''), undefined, {
      sensitivity: 'base',
      numeric: true,
    }),
  )
  const pageCount = Math.max(1, Math.ceil(sortedTeachers.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageTeachers = sortedTeachers.slice((page - 1) * 10, page * 10)

  return (
    <div className="dashboard-content">
      <p className="view-hint">Lists the name, section (if applicable), and the last activity of every teacher.</p>
      <div className="users-view-toolbar">
        <div className="user-management-actions">
          <button className="add-user-button" type="button" onClick={() => {
            setCreateUserError('')
            setIsAddUserOpen(true)
          }}>
            Add teacher
          </button>
          <button className="add-user-button" type="button" onClick={() => {
            setUpdateUserError('')
            setSelectedProfileUuid('')
            setEditUserFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
            setIsEditUserOpen(true)
          }}>
            Edit teacher
          </button>
          <button className="delete-user-button" type="button" onClick={() => {
            setDeleteUserError('')
            setSelectedDeleteProfileUuid('')
            setIsDeleteConfirmed(false)
            setIsDeleteUserOpen(true)
          }}>
            Delete teacher
          </button>
        </div>
      </div>
      {isUsersLoading && <p>Loading teachers...</p>}
      {usersError && <p className="records-error" role="alert">Unable to load teachers: {usersError}</p>}
      {!isUsersLoading && !usersError && users.length === 0 && <p>No teachers found.</p>}
      {!isUsersLoading && !usersError && users.length > 0 && filteredUsers.length === 0 && <p>No teachers found in this section.</p>}
      {!isUsersLoading && !usersError && filteredUsers.length > 0 && (
        <>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={filteredUsers.length}
            onPageChange={setCurrentPage}
          />
          <DataTable rows={pageTeachers} />
        </>
      )}
      {isAddUserOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreatingUser) setIsAddUserOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isCreatingUser) setIsAddUserOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="add-teacher-title">
            <header className="add-user-dialog-header">
              <h2 id="add-teacher-title">Add teacher</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isCreatingUser}
                onClick={() => setIsAddUserOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleCreateUser}>
              <div className="field-group">
                <label htmlFor="new-teacher-email">Email</label>
                <input
                  id="new-teacher-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-teacher-password">Password</label>
                <input
                  id="new-teacher-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={newUser.password}
                  onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-teacher-first-name">First name</label>
                <input
                  id="new-teacher-first-name"
                  name="first_name"
                  autoComplete="given-name"
                  value={newUser.first_name}
                  onChange={(event) => setNewUser({ ...newUser, first_name: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-teacher-last-name">Last name</label>
                <input
                  id="new-teacher-last-name"
                  name="last_name"
                  autoComplete="family-name"
                  value={newUser.last_name}
                  onChange={(event) => setNewUser({ ...newUser, last_name: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-teacher-middle-name">Middle name</label>
                <input
                  id="new-teacher-middle-name"
                  name="middle_name"
                  autoComplete="additional-name"
                  value={newUser.middle_name}
                  onChange={(event) => setNewUser({ ...newUser, middle_name: event.target.value })}
                />
              </div>
              <div className="field-group">
                <label htmlFor="new-teacher-section">Section</label>
                <select
                  id="new-teacher-section"
                  name="section"
                  value={newUser.section}
                  onChange={(event) => setNewUser({ ...newUser, section: event.target.value })}
                  required
                >
                  <option value="" disabled>Select a section</option>
                  {sections.map(({ id, section_name }) => (
                    <option key={id} value={id}>{section_name}</option>
                  ))}
                </select>
              </div>
              {createUserError && <p className="add-user-error" role="alert">{createUserError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isCreatingUser} onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isCreatingUser || sections.length === 0}>
                  {isCreatingUser ? 'Adding...' : 'Add teacher'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {isEditUserOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUpdatingUser) setIsEditUserOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isUpdatingUser) setIsEditUserOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-teacher-title">
            <header className="add-user-dialog-header">
              <h2 id="edit-teacher-title">Edit teacher</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isUpdatingUser}
                onClick={() => setIsEditUserOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleUpdateUser}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="edit-teacher-profile">Teacher</label>
                <select
                  id="edit-teacher-profile"
                  value={selectedProfileUuid}
                  onChange={(event) => setSelectedProfileUuid(event.target.value)}
                  required
                >
                  <option value="" disabled>Select a teacher</option>
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
                  <label htmlFor={`edit-teacher-${field}`}>{label}</label>
                  <input
                    id={`edit-teacher-${field}`}
                    type={type}
                    autoComplete={field === 'password' ? 'new-password' : 'off'}
                    placeholder="Leave unchanged"
                    value={editUserFields[field]}
                    onChange={(event) => setEditUserFields({ ...editUserFields, [field]: event.target.value })}
                  />
                </div>
              ))}
              <div className="field-group">
                <label htmlFor="edit-teacher-section">Section</label>
                <select
                  id="edit-teacher-section"
                  value={editUserFields.section}
                  onChange={(event) => setEditUserFields({ ...editUserFields, section: event.target.value })}
                >
                  <option value="">Leave unchanged</option>
                  {sections.map(({ id, section_name }) => (
                    <option key={id} value={id}>{section_name}</option>
                  ))}
                </select>
              </div>
              {updateUserError && <p className="add-user-error" role="alert">{updateUserError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isUpdatingUser} onClick={() => setIsEditUserOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingUser || manageableProfiles.length === 0}>
                  {isUpdatingUser ? 'Saving...' : 'Save changes'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {isDeleteUserOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeletingUser) setIsDeleteUserOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isDeletingUser) setIsDeleteUserOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-teacher-title">
            <header className="add-user-dialog-header">
              <h2 id="delete-teacher-title">Delete teacher</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isDeletingUser}
                onClick={() => setIsDeleteUserOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleDeleteUser}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="delete-teacher-profile">Teacher</label>
                <select
                  id="delete-teacher-profile"
                  value={selectedDeleteProfileUuid}
                  onChange={(event) => {
                    setSelectedDeleteProfileUuid(event.target.value)
                    setIsDeleteConfirmed(false)
                    setDeleteUserError('')
                  }}
                  required
                >
                  <option value="" disabled>Select a teacher</option>
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
              {deleteUserError && <p className="add-user-error" role="alert">{deleteUserError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isDeletingUser} onClick={() => setIsDeleteUserOpen(false)}>
                  Cancel
                </button>
                <button className="delete-user-confirm-button" type="submit" disabled={isDeletingUser || !isDeleteConfirmed}>
                  {isDeletingUser ? 'Deleting...' : 'Delete permanently'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}