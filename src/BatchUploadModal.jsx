import { useState, useRef } from 'react'
import { supabase } from './utils/supabase'

export default function BatchUploadModal({ isOpen, onClose, sections = [], onSuccess }) {
  const [parsedRows, setParsedRows] = useState([])
  const [parseErrors, setParseErrors] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [uploadResults, setUploadResults] = useState(null)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  // Section lookup map (supports case-insensitive name matching or numeric id)
  const sectionMap = new Map()
  for (const s of sections) {
    if (s.id !== null && s.id !== undefined) {
      sectionMap.set(String(s.id), s.id)
      if (s.section_name) {
        sectionMap.set(String(s.section_name).trim().toLowerCase(), s.id)
      }
    }
  }

  const downloadTemplate = () => {
    const sampleSection = sections.length > 0 ? (sections[0].section_name || '1') : '1'
    const headers = ['email', 'password', 'first_name', 'last_name', 'middle_name', 'section']
    const sampleRows = [
      ['student1@sample.com', 'Pass1234!', 'Juan', 'Dela Cruz', 'Santos', sampleSection],
      ['student2@sample.com', 'Pass1234!', 'Maria Clara', 'Ibarra', 'Reyes', sampleSection],
    ]
    const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'students_batch_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) {
      setParseErrors(['The CSV file must contain a header row and at least one student row.'])
      setParsedRows([])
      return
    }

    const header = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase())
    const emailIdx = header.indexOf('email')
    const passIdx = header.indexOf('password')
    const fnIdx = header.indexOf('first_name')
    const lnIdx = header.indexOf('last_name')
    const mnIdx = header.indexOf('middle_name')
    const secIdx = header.indexOf('section')

    if (emailIdx === -1 || passIdx === -1 || fnIdx === -1 || lnIdx === -1 || secIdx === -1) {
      setParseErrors([
        'CSV must have columns: email, password, first_name, last_name, middle_name (optional), section',
      ])
      setParsedRows([])
      return
    }

    const rows = []
    const errors = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Simple CSV split (handling basic quoted strings)
      const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim())
      const rowNum = i + 1

      const email = cols[emailIdx] || ''
      const password = cols[passIdx] || ''
      const first_name = cols[fnIdx] || ''
      const last_name = cols[lnIdx] || ''
      const middle_name = mnIdx !== -1 ? (cols[mnIdx] || '') : ''
      const rawSection = cols[secIdx] || ''

      const rowErrors = []
      if (!email || !email.includes('@')) rowErrors.push('Invalid email')
      if (!password || password.length < 6) rowErrors.push('Password must be at least 6 chars')
      if (!first_name) rowErrors.push('Missing first name')
      if (!last_name) rowErrors.push('Missing last name')

      const matchedSectionId = sectionMap.get(rawSection.toLowerCase())
      if (matchedSectionId === undefined) {
        rowErrors.push(`Unknown section "${rawSection}"`)
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNum} (${first_name} ${last_name || email}): ${rowErrors.join(', ')}`)
      }

      rows.push({
        rowNum,
        email,
        password,
        first_name,
        last_name,
        middle_name,
        rawSection,
        sectionId: matchedSectionId,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      })
    }

    setParseErrors(errors)
    setParsedRows(rows)
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setUploadResults(null)
    setUploadProgress(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      parseCsvText(evt.target.result || '')
    }
    reader.readAsText(selected)
  }

  const handleUploadAll = async () => {
    const validRows = parsedRows.filter((r) => r.isValid)
    if (validRows.length === 0) return

    setIsUploading(true)
    setUploadResults(null)

    let createdCount = 0
    let failedCount = 0
    const failureDetails = []

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('Your session has expired. Sign in again.')
      }

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i]
        setUploadProgress({ current: i + 1, total: validRows.length, name: `${row.first_name} ${row.last_name}` })

        try {
          const response = await fetch('https://iwobhagcimhndnyzppmf.supabase.co/functions/v1/teacher-create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: row.email,
              password: row.password,
              first_name: row.first_name,
              last_name: row.last_name,
              middle_name: row.middle_name.trim() || null,
              section: Number(row.sectionId),
            }),
          })

          const data = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(data?.message || data?.error || `Failed (HTTP ${response.status})`)
          }
          createdCount += 1
        } catch (err) {
          failedCount += 1
          failureDetails.push(`${row.first_name} ${row.last_name} (${row.email}): ${err.message}`)
        }
      }

      setUploadResults({
        success: createdCount,
        failed: failedCount,
        failureDetails,
      })

      if (createdCount > 0 && onSuccess) {
        onSuccess()
      }
    } catch (globalErr) {
      setParseErrors([globalErr.message || 'Batch creation failed.'])
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleClose = () => {
    if (isUploading) return
    setParsedRows([])
    setParseErrors([])
    setUploadResults(null)
    setUploadProgress(null)
    onClose()
  }

  const validCount = parsedRows.filter((r) => r.isValid).length

  return (
    <div
      className="add-user-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isUploading) handleClose()
      }}
    >
      <section
        className="add-user-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-modal-title"
        style={{ maxWidth: '640px', width: '92%' }}
      >
        <header className="add-user-dialog-header">
          <h2 id="batch-modal-title">Batch Upload Students</h2>
          <button
            className="dialog-close-button"
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
          {/* Step 1: Download Template */}
          <div style={{ background: 'var(--code-bg, #f4f4f4)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
            <strong>Step 1:</strong> Download the pre-formatted template and fill it with your student list.
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="add-user-button"
                onClick={downloadTemplate}
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                Download CSV Template
              </button>
            </div>
          </div>

          {/* Step 2: Select CSV File */}
          <div style={{ fontSize: '14px' }}>
            <strong>Step 2:</strong> Upload your completed CSV file.
            <div style={{ marginTop: '8px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
                style={{ fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && uploadProgress && (
            <div style={{ background: 'rgba(65, 105, 225, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent)' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
                Creating accounts: {uploadProgress.current} of {uploadProgress.total}...
              </p>
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>Adding {uploadProgress.name}</span>
            </div>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <div style={{
              background: uploadResults.failed === 0 ? 'rgba(47, 158, 68, 0.1)' : 'rgba(245, 159, 0, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${uploadResults.failed === 0 ? '#2f9e44' : '#f59f00'}`
            }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, color: uploadResults.failed === 0 ? '#2f9e44' : '#d97706' }}>
                {uploadResults.success} {uploadResults.success === 1 ? 'student' : 'students'} successfully added.
                {uploadResults.failed > 0 && ` (${uploadResults.failed} failed)`}
              </p>
              {uploadResults.failureDetails.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '13px', color: '#e03131' }}>
                  {uploadResults.failureDetails.map((f, idx) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Parse validation summary */}
          {parsedRows.length > 0 && !uploadResults && (
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600 }}>
                Found {parsedRows.length} rows ({validCount} valid, {parsedRows.length - validCount} with errors):
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                {parsedRows.slice(0, 10).map((r) => (
                  <li key={r.rowNum} style={{ color: r.isValid ? 'inherit' : '#e03131' }}>
                    {r.first_name} {r.last_name} ({r.email}) — Section: {r.rawSection} {r.isValid ? '✓' : `✗ (${r.errors.join(', ')})`}
                  </li>
                ))}
                {parsedRows.length > 10 && <li>...and {parsedRows.length - 10} more rows</li>}
              </ul>
            </div>
          )}

          {parseErrors.length > 0 && !uploadResults && (
            <div style={{ color: '#e03131', fontSize: '13px' }}>
              <strong>Notice:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="add-user-form-actions">
          <button type="button" onClick={handleClose} disabled={isUploading}>
            {uploadResults ? 'Close' : 'Cancel'}
          </button>
          {!uploadResults && (
            <button
              className="add-user-submit-button"
              type="button"
              onClick={handleUploadAll}
              disabled={isUploading || validCount === 0}
            >
              {isUploading ? 'Uploading...' : `Upload ${validCount} Student${validCount === 1 ? '' : 's'}`}
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
