import { useState } from 'react'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'
import UserModals from './UserModals.jsx'

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
      {!isStudentsLoading && !studentsError && students.length > 0 && filteredStudents.length === 0 && (
        <p>No students found in this section.</p>
      )}
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

      <UserModals
        entityType="student"
        sections={sections}
        manageableProfiles={manageableProfiles}
        isAddOpen={isAddStudentOpen}
        setIsAddOpen={setIsAddStudentOpen}
        newUser={newStudent}
        setNewUser={setNewStudent}
        isCreating={isCreatingStudent}
        createError={createStudentError}
        onCreate={handleCreateStudent}
        isEditOpen={isEditStudentOpen}
        setIsEditOpen={setIsEditStudentOpen}
        selectedProfileUuid={selectedProfileUuid}
        setSelectedProfileUuid={setSelectedProfileUuid}
        editFields={editStudentFields}
        setEditFields={setEditStudentFields}
        isUpdating={isUpdatingStudent}
        updateError={updateStudentError}
        onUpdate={handleUpdateStudent}
        isDeleteOpen={isDeleteStudentOpen}
        setIsDeleteOpen={setIsDeleteStudentOpen}
        selectedDeleteProfileUuid={selectedDeleteProfileUuid}
        setSelectedDeleteProfileUuid={setSelectedDeleteProfileUuid}
        isDeleteConfirmed={isDeleteConfirmed}
        setIsDeleteConfirmed={setIsDeleteConfirmed}
        isDeleting={isDeletingStudent}
        deleteError={deleteStudentError}
        onDelete={handleDeleteStudent}
      />
    </div>
  )
}
