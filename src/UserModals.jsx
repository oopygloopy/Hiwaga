import { getProfileLabel, getProfileUuid } from './utils/formatters'

export default function UserModals({
  entityType = 'student',
  sections = [],
  manageableProfiles = [],
  // Add modal
  isAddOpen,
  setIsAddOpen,
  newUser,
  setNewUser,
  isCreating,
  createError,
  onCreate,
  // Edit modal
  isEditOpen,
  setIsEditOpen,
  selectedProfileUuid,
  setSelectedProfileUuid,
  editFields,
  setEditFields,
  isUpdating,
  updateError,
  onUpdate,
  // Delete modal
  isDeleteOpen,
  setIsDeleteOpen,
  selectedDeleteProfileUuid,
  setSelectedDeleteProfileUuid,
  isDeleteConfirmed,
  setIsDeleteConfirmed,
  isDeleting,
  deleteError,
  onDelete,
}) {
  return (
    <>
      {isAddOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreating) setIsAddOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isCreating) setIsAddOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby={`add-${entityType}-title`}>
            <header className="add-user-dialog-header">
              <h2 id={`add-${entityType}-title`}>Add {entityType}</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isCreating}
                onClick={() => setIsAddOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={onCreate}>
              <div className="field-group">
                <label htmlFor={`new-${entityType}-email`}>Email</label>
                <input
                  id={`new-${entityType}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor={`new-${entityType}-password`}>Password</label>
                <input
                  id={`new-${entityType}-password`}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={newUser.password}
                  onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor={`new-${entityType}-first-name`}>First name</label>
                <input
                  id={`new-${entityType}-first-name`}
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  value={newUser.first_name}
                  onChange={(event) => setNewUser({ ...newUser, first_name: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor={`new-${entityType}-last-name`}>Last name</label>
                <input
                  id={`new-${entityType}-last-name`}
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  value={newUser.last_name}
                  onChange={(event) => setNewUser({ ...newUser, last_name: event.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor={`new-${entityType}-middle-name`}>Middle name</label>
                <input
                  id={`new-${entityType}-middle-name`}
                  name="middle_name"
                  type="text"
                  autoComplete="additional-name"
                  value={newUser.middle_name}
                  onChange={(event) => setNewUser({ ...newUser, middle_name: event.target.value })}
                />
              </div>
              <div className="field-group">
                <label htmlFor={`new-${entityType}-section`}>Section</label>
                <select
                  id={`new-${entityType}-section`}
                  name="section"
                  value={newUser.section}
                  onChange={(event) => setNewUser({ ...newUser, section: event.target.value })}
                  required
                >
                  <option value="">Select a section</option>
                  {sections.map(({ id, section_name }) => (
                    <option key={id} value={id}>{section_name}</option>
                  ))}
                </select>
              </div>
              {createError && <p className="add-user-error" role="alert">{createError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isCreating} onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isCreating}>
                  {isCreating ? `Adding ${entityType}...` : `Add ${entityType}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {isEditOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUpdating) setIsEditOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isUpdating) setIsEditOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby={`edit-${entityType}-title`}>
            <header className="add-user-dialog-header">
              <h2 id={`edit-${entityType}-title`}>Edit {entityType}</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isUpdating}
                onClick={() => setIsEditOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={onUpdate}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor={`edit-${entityType}-select`}>Select {entityType}</label>
                <select
                  id={`edit-${entityType}-select`}
                  value={selectedProfileUuid}
                  onChange={(event) => {
                    setSelectedProfileUuid(event.target.value)
                    setEditFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
                  }}
                  required
                >
                  <option value="">Choose a {entityType}</option>
                  {manageableProfiles.map((profile) => {
                    const uuid = getProfileUuid(profile)
                    return (
                      <option key={uuid} value={uuid}>
                        {getProfileLabel(profile)}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-email`}>Email (leave blank to keep)</label>
                <input
                  id={`edit-${entityType}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={editFields.email}
                  onChange={(event) => setEditFields({ ...editFields, email: event.target.value })}
                  placeholder="New email"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-password`}>Password (leave blank to keep)</label>
                <input
                  id={`edit-${entityType}-password`}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={editFields.password}
                  onChange={(event) => setEditFields({ ...editFields, password: event.target.value })}
                  placeholder="New password"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-first-name`}>First name (leave blank to keep)</label>
                <input
                  id={`edit-${entityType}-first-name`}
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  value={editFields.first_name}
                  onChange={(event) => setEditFields({ ...editFields, first_name: event.target.value })}
                  placeholder="New first name"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-last-name`}>Last name (leave blank to keep)</label>
                <input
                  id={`edit-${entityType}-last-name`}
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  value={editFields.last_name}
                  onChange={(event) => setEditFields({ ...editFields, last_name: event.target.value })}
                  placeholder="New last name"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-middle-name`}>Middle name (leave blank to keep)</label>
                <input
                  id={`edit-${entityType}-middle-name`}
                  name="middle_name"
                  type="text"
                  autoComplete="additional-name"
                  value={editFields.middle_name}
                  onChange={(event) => setEditFields({ ...editFields, middle_name: event.target.value })}
                  placeholder="New middle name"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-section`}>Section (leave blank to keep)</label>
                <select
                  id={`edit-${entityType}-section`}
                  name="section"
                  value={editFields.section}
                  onChange={(event) => setEditFields({ ...editFields, section: event.target.value })}
                >
                  <option value="">Keep current section</option>
                  {sections.map(({ id, section_name }) => (
                    <option key={id} value={id}>{section_name}</option>
                  ))}
                </select>
              </div>
              {updateError && <p className="add-user-error" role="alert">{updateError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isUpdating} onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating}>
                  {isUpdating ? `Saving ${entityType}...` : `Save ${entityType}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {isDeleteOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) setIsDeleteOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isDeleting) setIsDeleteOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby={`delete-${entityType}-title`}>
            <header className="add-user-dialog-header">
              <h2 id={`delete-${entityType}-title`}>Delete {entityType}</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isDeleting}
                onClick={() => setIsDeleteOpen(false)}
              >
                Close
              </button>
            </header>
            <form className="add-user-form" onSubmit={onDelete}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor={`delete-${entityType}-select`}>Select {entityType}</label>
                <select
                  id={`delete-${entityType}-select`}
                  value={selectedDeleteProfileUuid}
                  onChange={(event) => {
                    setSelectedDeleteProfileUuid(event.target.value)
                    setIsDeleteConfirmed(false)
                  }}
                  required
                >
                  <option value="">Choose a {entityType}</option>
                  {manageableProfiles.map((profile) => {
                    const uuid = getProfileUuid(profile)
                    return (
                      <option key={uuid} value={uuid}>
                        {getProfileLabel(profile)}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="delete-user-warning">
                <strong>Warning:</strong> Deleting a {entityType} account removes authentication and all associated records permanently. This cannot be undone.
              </div>
              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isDeleteConfirmed}
                  onChange={(event) => setIsDeleteConfirmed(event.target.checked)}
                />
                I understand this action is permanent and cannot be undone.
              </label>
              {deleteError && <p className="add-user-error" role="alert">{deleteError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isDeleting} onClick={() => setIsDeleteOpen(false)}>
                  Cancel
                </button>
                <button
                  className="delete-user-confirm-button"
                  type="submit"
                  disabled={isDeleting || !isDeleteConfirmed}
                >
                  {isDeleting ? `Deleting ${entityType}...` : `Permanently delete ${entityType}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
