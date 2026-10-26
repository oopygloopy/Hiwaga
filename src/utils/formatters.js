export const formatCell = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export const formatAverage = (value, suffix = '') => (
  Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : '-'
)

export const getProfileUuid = (profile) => (
  profile?.uuid ?? profile?.user_id ?? profile?.id
)

export const getProfileLabel = (profile, fallback = '') => {
  if (!profile) return fallback
  const firstName = profile.first_name?.trim()
  const lastName = profile.last_name?.trim()
  const middleInitial = profile.middle_name?.trim()?.[0]
  const name = [lastName, firstName && `${firstName}${middleInitial ? ` ${middleInitial}.` : ''}`]
    .filter(Boolean)
    .join(', ')

  return name || String(getProfileUuid(profile) ?? fallback)
}

export const compareRecordsByTime = (firstRecord, secondRecord, direction = -1) => {
  const firstValue = firstRecord.Time
  const secondValue = secondRecord.Time

  if (firstValue === null || firstValue === undefined) return 1
  if (secondValue === null || secondValue === undefined) return -1

  const firstDate = Date.parse(firstRecord.Date)
  const secondDate = Date.parse(secondRecord.Date)

  if (Number.isFinite(firstDate) && Number.isFinite(secondDate) && firstDate !== secondDate) {
    return (firstDate - secondDate) * direction
  }

  const firstTime = Date.parse(firstValue)
  const secondTime = Date.parse(secondValue)

  if (Number.isFinite(firstTime) && Number.isFinite(secondTime)) {
    return (firstTime - secondTime) * direction
  }

  const firstNumber = Number(firstValue)
  const secondNumber = Number(secondValue)

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return (firstNumber - secondNumber) * direction
  }

  return String(firstValue).localeCompare(String(secondValue)) * direction
}

export const getColumns = (rows, exclude = []) => rows.reduce((allColumns, row) => {
  Object.keys(row).forEach((column) => {
    if (!exclude.includes(column) && !allColumns.includes(column)) {
      allColumns.push(column)
    }
  })
  return allColumns
}, [])

