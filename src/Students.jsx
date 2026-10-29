import { useState } from 'react'
import DataTable from './DataTable.jsx'
import PaginationControls from './PaginationControls.jsx'
import UserModals from './UserModals.jsx'
import BatchUploadModal from './BatchUploadModal.jsx'
import { getProfileLabel, getProfileUuid } from './utils/formatters'
import editIcon from './assets/edit.svg'
import deleteIcon from './assets/delete.svg'

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
  onRefresh,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false)
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
      <p className="view-hint">Lists the name, section, and the last activity of every student.</p>
      <div className="management-toolbar">
        <div className="user-management-actions">
          <button className="add-user-button" type="button" onClick={() => {
            setCreateStudentError('')
            setIsAddStudentOpen(true)
          }}>
            Add student
          </button>
          <button
            className="add-user-button"
            type="button"
            onClick={() => setIsBatchUploadOpen(true)}
          >
            Batch upload
          </button>
        </div>
      </div>
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
          <DataTable
            rows={pageStudents}
            rowActions={(row) => (
              <div className="row-actions">
                <button
                  type="button"
                  className="row-action-btn row-action-edit"
                  title="Edit student"
                  aria-label={`Edit ${row.Name || 'student'}`}
                  onClick={() => {
                    const uuid = getUuidForRow(row)
                    setUpdateStudentError('')
                    setSelectedProfileUuid(uuid)
                    setEditStudentFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
                    setIsEditStudentOpen(true)
                  }}
                >
                  <img src={editIcon} alt="" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="row-action-btn row-action-delete"
                  title="Delete student"
                  aria-label={`Delete ${row.Name || 'student'}`}
                  onClick={() => {
                    const uuid = getUuidForRow(row)
                    setDeleteStudentError('')
                    setSelectedDeleteProfileUuid(uuid)
                    setIsDeleteConfirmed(false)
                    setIsDeleteStudentOpen(true)
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

      <BatchUploadModal
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        sections={sections}
        onSuccess={() => {
          if (onRefresh) onRefresh()
        }}
      />
    </div>
  )
}
