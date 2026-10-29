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

export const getProfileShortLabel = (profile, fallback = '') => {
  if (!profile) return fallback
  const lastName = profile.last_name?.trim()
  const firstInitial = profile.first_name?.trim()?.[0]?.toUpperCase()
  const middleInitial = profile.middle_name?.trim()?.[0]?.toUpperCase()

  const initials = [
    firstInitial && `${firstInitial}.`,
    middleInitial && `${middleInitial}.`,
  ].filter(Boolean).join(' ')

  const name = [lastName, initials].filter(Boolean).join(', ')
  return name || String(getProfileUuid(profile) ?? fallback)
}

export const shortenName = (nameString) => {
  if (!nameString || typeof nameString !== 'string') return nameString
  const trimmed = nameString.trim()
  if (!trimmed || trimmed === '-') return trimmed

  if (trimmed.includes(',')) {
    const [lastName, rest] = trimmed.split(',', 2).map((s) => s.trim())
    if (!rest) return lastName

    const parts = rest.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return lastName
    const firstInitial = `${parts[0][0].toUpperCase()}.`
    const middleInitial = parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : ''

    const initials = [firstInitial, middleInitial].filter(Boolean).join(' ')
    return `${lastName}, ${initials}`
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return trimmed

  const lastName = parts[parts.length - 1]
  const firstInitial = `${parts[0][0].toUpperCase()}.`
  const middleInitial = parts.length > 2 ? `${parts[parts.length - 2][0].toUpperCase()}.` : ''
  const initials = [firstInitial, middleInitial].filter(Boolean).join(' ')
  return `${lastName}, ${initials}`
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

