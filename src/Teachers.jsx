import { useState } from 'react'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'
import UserModals from './UserModals.jsx'
import { getProfileLabel, getProfileUuid } from './utils/formatters'
import editIcon from './assets/edit.svg'
import deleteIcon from './assets/delete.svg'

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

  const getProfileForRow = (row) => {
    if (!row) return null

    // 1. Direct uuid match
    const directUuid = row.uuid || row.UUID
    if (directUuid) {
      const match = manageableProfiles.find((p) => String(p.uuid) === String(directUuid))
      if (match) return match
    }

    // 2. ID-based match (user_id, id, ID, User ID, user, etc.)
    const possibleIds = [
      row.user_id,
      row.id,
      row.ID,
      row.userId,
      row.UserId,
      row['user_id'],
      row['User ID'],
      row['User Id'],
      row.user,
      row.User,
    ].filter((v) => v !== undefined && v !== null && v !== '')

    for (const idVal of possibleIds) {
      const idStr = String(idVal).trim()
      const match = manageableProfiles.find(
        (p) => String(p.user_id) === idStr ||
               String(p.id) === idStr ||
               String(p.uuid) === idStr
      )
      if (match) return match
    }

    // 3. Name-based match with normalization
    const rowName = String(row.Name ?? row.name ?? row.Student ?? row.student ?? '').trim()
    if (rowName) {
      const cleanRowName = rowName.toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim()
      const rowTokens = cleanRowName.split(' ').filter(Boolean).sort()

      for (const p of manageableProfiles) {
        const f = (p.first_name || '').toLowerCase().trim()
        const l = (p.last_name || '').toLowerCase().trim()
        const m = (p.middle_name || '').toLowerCase().trim()

        const nameVariants = [
          `${f} ${l}`,
          `${l} ${f}`,
          `${f} ${m} ${l}`,
          `${l} ${f} ${m}`,
          `${f} ${m ? m[0] : ''} ${l}`,
          `${l} ${f} ${m ? m[0] : ''}`,
          getProfileLabel(p).toLowerCase(),
        ].map((n) => n.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim())

        if (nameVariants.includes(cleanRowName)) {
          return p
        }

        // Token match: if both first and last name tokens are in the row name
        if (f && l) {
          const profileTokens = `${f} ${l}`.split(' ').filter(Boolean).sort()
          if (profileTokens.every((t) => rowTokens.includes(t))) {
            return p
          }
        }
      }
    }

    return null
  }

  const getUuidForRow = (row) => {
    const profile = getProfileForRow(row)
    if (profile?.uuid) return profile.uuid
    if (getProfileUuid(profile)) return getProfileUuid(profile)
    return row.uuid ?? row.UUID ?? row.user_id ?? row.id ?? ''
  }

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
        </div>
      </div>

      {isUsersLoading && <p>Loading teachers...</p>}
      {usersError && <p className="records-error" role="alert">Unable to load teachers: {usersError}</p>}
      {!isUsersLoading && !usersError && users.length === 0 && <p>No teachers found.</p>}
      {!isUsersLoading && !usersError && users.length > 0 && filteredUsers.length === 0 && (
        <p>No teachers found in this section.</p>
      )}
      {!isUsersLoading && !usersError && filteredUsers.length > 0 && (
        <>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={filteredUsers.length}
            onPageChange={setCurrentPage}
          />
          <DataTable
            rows={pageTeachers}
            rowActions={(row) => (
              <div className="row-actions">
                <button
                  type="button"
                  className="row-action-btn row-action-edit"
                  title="Edit teacher"
                  aria-label={`Edit ${row.Name || 'teacher'}`}
                  onClick={() => {
                    const uuid = getUuidForRow(row)
                    setUpdateUserError('')
                    setSelectedProfileUuid(uuid)
                    setEditUserFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
                    setIsEditUserOpen(true)
                  }}
                >
                  <img src={editIcon} alt="" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="row-action-btn row-action-delete"
                  title="Delete teacher"
                  aria-label={`Delete ${row.Name || 'teacher'}`}
                  onClick={() => {
                    const uuid = getUuidForRow(row)
                    setDeleteUserError('')
                    setSelectedDeleteProfileUuid(uuid)
                    setIsDeleteConfirmed(false)
                    setIsDeleteUserOpen(true)
                  }}
                >
                  <img src={deleteIcon} alt="" aria-hidden="true" />
                </button>
              </div>
            )}
          />
        </>
      )}

      <UserModals
        entityType="teacher"
        sections={sections}
        manageableProfiles={manageableProfiles}
        isAddOpen={isAddUserOpen}
        setIsAddOpen={setIsAddUserOpen}
        newUser={newUser}
        setNewUser={setNewUser}
        isCreating={isCreatingUser}
        createError={createUserError}
        onCreate={handleCreateUser}
        isEditOpen={isEditUserOpen}
        setIsEditOpen={setIsEditUserOpen}
        selectedProfileUuid={selectedProfileUuid}
        setSelectedProfileUuid={setSelectedProfileUuid}
        editFields={editUserFields}
        setEditFields={setEditUserFields}
        isUpdating={isUpdatingUser}
        updateError={updateUserError}
        onUpdate={handleUpdateUser}
        isDeleteOpen={isDeleteUserOpen}
        setIsDeleteOpen={setIsDeleteUserOpen}
        selectedDeleteProfileUuid={selectedDeleteProfileUuid}
        setSelectedDeleteProfileUuid={setSelectedDeleteProfileUuid}
        isDeleteConfirmed={isDeleteConfirmed}
        setIsDeleteConfirmed={setIsDeleteConfirmed}
        isDeleting={isDeletingUser}
        deleteError={deleteUserError}
        onDelete={handleDeleteUser}
      />
    </div>
  )
}
