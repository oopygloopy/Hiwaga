import { getProfileLabel, getProfileUuid } from './utils/formatters'
import SearchableSelect from './SearchableSelect.jsx'

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
  // Archive modal
  isArchiveOpen,
  setIsArchiveOpen,
  selectedArchiveProfileUuid,
  setSelectedArchiveProfileUuid,
  isArchiveConfirmed,
  setIsArchiveConfirmed,
  isArchiving,
  archiveError,
  onArchive,
  // Restore modal
  isRestoreOpen,
  setIsRestoreOpen,
  selectedRestoreProfileUuid,
  setSelectedRestoreProfileUuid,
  isRestoreConfirmed,
  setIsRestoreConfirmed,
  isRestoring,
  restoreError,
  onRestore,
}) {
  const targetEditProfile = manageableProfiles.find(
    (p) => String(getProfileUuid(p) ?? '') === String(selectedProfileUuid) ||
           String(p.uuid ?? '') === String(selectedProfileUuid) ||
           String(p.user_id ?? '') === String(selectedProfileUuid)
  )
  const editProfileName = targetEditProfile
    ? getProfileLabel(targetEditProfile)
    : (selectedProfileUuid || '')

  const targetArchiveProfile = manageableProfiles.find(
    (p) => String(getProfileUuid(p) ?? '') === String(selectedArchiveProfileUuid) ||
           String(p.uuid ?? '') === String(selectedArchiveProfileUuid) ||
           String(p.user_id ?? '') === String(selectedArchiveProfileUuid)
  )
  const archiveProfileName = targetArchiveProfile
    ? getProfileLabel(targetArchiveProfile)
    : (selectedArchiveProfileUuid || '')

  const targetRestoreProfile = manageableProfiles.find(
    (p) => String(getProfileUuid(p) ?? '') === String(selectedRestoreProfileUuid) ||
           String(p.uuid ?? '') === String(selectedRestoreProfileUuid) ||
           String(p.user_id ?? '') === String(selectedRestoreProfileUuid)
  )
  const restoreProfileName = targetRestoreProfile
    ? getProfileLabel(targetRestoreProfile)
    : (selectedRestoreProfileUuid || '')


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
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={onCreate}>
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
                  required={entityType !== 'teacher'}
                >
                  <option value="">{entityType === 'teacher' ? 'No Section' : 'Select a section'}</option>
                  {sections.map(({ id, section_name, school_year }) => (
                    <option key={id} value={id}>
                      {section_name}{school_year ? ` (${school_year})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group field-full-width">
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
              {entityType !== 'teacher' && (
                <div className="field-group field-full-width">
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
              )}
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
              <h2 id={`edit-${entityType}-title`}>Edit {editProfileName || entityType}</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isUpdating}
                onClick={() => setIsEditOpen(false)}
              >
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={onUpdate}>
              {!selectedProfileUuid && (
                <div className="field-group edit-user-profile-select">
                  <label htmlFor={`edit-${entityType}-select`}>Select {entityType}</label>
                  <SearchableSelect
                    id={`edit-${entityType}-select`}
                    options={manageableProfiles.map((profile) => ({
                      value: getProfileUuid(profile),
                      label: getProfileLabel(profile),
                    }))}
                    value={selectedProfileUuid}
                    onChange={(val) => {
                      setSelectedProfileUuid(val)
                      setEditFields({ email: '', password: '', first_name: '', last_name: '', middle_name: '', section: '' })
                    }}
                    placeholder={`Choose a ${entityType}`}
                    required
                  />
                </div>
              )}
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-first-name`}>First name</label>
                <input
                  id={`edit-${entityType}-first-name`}
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  value={editFields.first_name}
                  onChange={(event) => setEditFields({ ...editFields, first_name: event.target.value })}
                  placeholder="Leave unchanged"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-last-name`}>Last name</label>
                <input
                  id={`edit-${entityType}-last-name`}
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  value={editFields.last_name}
                  onChange={(event) => setEditFields({ ...editFields, last_name: event.target.value })}
                  placeholder="Leave unchanged"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-middle-name`}>Middle name</label>
                <input
                  id={`edit-${entityType}-middle-name`}
                  name="middle_name"
                  type="text"
                  autoComplete="additional-name"
                  value={editFields.middle_name}
                  onChange={(event) => setEditFields({ ...editFields, middle_name: event.target.value })}
                  placeholder="Leave unchanged"
                />
              </div>
              <div className="field-group">
                <label htmlFor={`edit-${entityType}-section`}>Section</label>
                <select
                  id={`edit-${entityType}-section`}
                  name="section"
                  value={editFields.section}
                  onChange={(event) => setEditFields({ ...editFields, section: event.target.value })}
                >
                  <option value="">Keep current section</option>
                  {sections.map(({ id, section_name, school_year }) => (
                    <option key={id} value={id}>
                      {section_name}{school_year ? ` (${school_year})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group field-full-width">
                <label htmlFor={`edit-${entityType}-email`}>Email</label>
                <input
                  id={`edit-${entityType}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={editFields.email}
                  onChange={(event) => setEditFields({ ...editFields, email: event.target.value })}
                  placeholder="Leave unchanged"
                />
              </div>
              <div className="field-group field-full-width">
                <label htmlFor={`edit-${entityType}-password`}>Password</label>
                <input
                  id={`edit-${entityType}-password`}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={editFields.password}
                  onChange={(event) => setEditFields({ ...editFields, password: event.target.value })}
                  placeholder="Leave unchanged"
                />
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

      {isArchiveOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isArchiving) setIsArchiveOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isArchiving) setIsArchiveOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby={`archive-${entityType}-title`}>
            <header className="add-user-dialog-header">
              <h2 id={`archive-${entityType}-title`}>Archive {archiveProfileName || entityType}</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isArchiving}
                onClick={() => setIsArchiveOpen(false)}
              >
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={onArchive}>
              {!selectedArchiveProfileUuid && (
                <div className="field-group edit-user-profile-select">
                  <label htmlFor={`archive-${entityType}-select`}>Select {entityType}</label>
                  <SearchableSelect
                    id={`archive-${entityType}-select`}
                    options={manageableProfiles.map((profile) => ({
                      value: getProfileUuid(profile),
                      label: getProfileLabel(profile),
                    }))}
                    value={selectedArchiveProfileUuid}
                    onChange={(val) => {
                      setSelectedArchiveProfileUuid(val)
                      setIsArchiveConfirmed(false)
                    }}
                    placeholder={`Choose a ${entityType}`}
                    required
                  />
                </div>
              )}
              <div className="delete-user-warning">
                <strong>Notice:</strong> Archiving this {entityType} account will disable their login credentials. All quiz history, scores, and records are safely preserved.
              </div>
              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isArchiveConfirmed}
                  onChange={(event) => setIsArchiveConfirmed(event.target.checked)}
                />
                I understand this {entityType} account will be archived.
              </label>
              {archiveError && <p className="add-user-error" role="alert">{archiveError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isArchiving} onClick={() => setIsArchiveOpen(false)}>
                  Cancel
                </button>
                <button
                  className="delete-user-confirm-button"
                  type="submit"
                  disabled={isArchiving || !isArchiveConfirmed}
                >
                  {isArchiving ? `Archiving ${entityType}...` : `Archive ${entityType}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {isRestoreOpen && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isRestoring) setIsRestoreOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isRestoring) setIsRestoreOpen(false)
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby={`restore-${entityType}-title`}>
            <header className="add-user-dialog-header">
              <h2 id={`restore-${entityType}-title`}>Restore {restoreProfileName || entityType}</h2>
              <button
                className="add-user-close"
                type="button"
                aria-label="Close dialog"
                disabled={isRestoring}
                onClick={() => setIsRestoreOpen(false)}
              >
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={onRestore}>
              {!selectedRestoreProfileUuid && (
                <div className="field-group edit-user-profile-select">
                  <label htmlFor={`restore-${entityType}-select`}>Select {entityType}</label>
                  <SearchableSelect
                    id={`restore-${entityType}-select`}
                    options={manageableProfiles.map((profile) => ({
                      value: getProfileUuid(profile),
                      label: getProfileLabel(profile),
                    }))}
                    value={selectedRestoreProfileUuid}
                    onChange={(val) => {
                      setSelectedRestoreProfileUuid(val)
                      setIsRestoreConfirmed(false)
                    }}
                    placeholder={`Choose a ${entityType}`}
                    required
                  />
                </div>
              )}
              <div className="delete-user-warning" style={{ borderColor: '#2f9e44', background: 'rgba(47, 158, 68, 0.08)' }}>
                Restoring this {entityType} account will re-enable their login and restore their active status.
              </div>
              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isRestoreConfirmed}
                  onChange={(event) => setIsRestoreConfirmed(event.target.checked)}
                />
                I confirm that I want to restore this {entityType}.
              </label>
              {restoreError && <p className="add-user-error" role="alert">{restoreError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isRestoring} onClick={() => setIsRestoreOpen(false)}>
                  Cancel
                </button>
                <button
                  className="delete-user-confirm-button"
                  type="submit"
                  style={{ background: '#2f9e44', borderColor: '#2f9e44' }}
                  disabled={isRestoring || !isRestoreConfirmed}
                >
                  {isRestoring ? `Restoring ${entityType}...` : `Restore ${entityType}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
