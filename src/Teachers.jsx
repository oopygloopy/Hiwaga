import { useState } from 'react'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'
import UserModals from './UserModals.jsx'

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
          <DataTable rows={pageTeachers} />
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
