import { useEffect, useRef, useState } from 'react'

export default function SearchableSelect({
  id,
  options = [],
  value = '',
  onChange,
  placeholder = 'Search or select...',
  disabled = false,
  required = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div
      ref={containerRef}
      className={`searchable-select-root ${className}`.trim()}
    >
      <div
        className={`searchable-select-control ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev)
            if (!isOpen && inputRef.current) {
              inputRef.current.focus()
            }
          }
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          value={isOpen ? query : (selectedOption ? selectedOption.label : '')}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(true)
          }}
          className="searchable-select-input"
          required={required && !value}
          autoComplete="off"
        />
        <div className="searchable-select-actions">
          {value && !disabled && (
            <button
              type="button"
              className="searchable-select-clear-btn"
              onClick={handleClear}
              aria-label="Clear selection"
              title="Clear selection"
            >
              ×
            </button>
          )}
          <span className="searchable-select-chevron" aria-hidden="true">▾</span>
        </div>
      </div>

      {isOpen && (
        <ul className="searchable-select-menu" role="listbox">
          {placeholder && (
            <li
              role="option"
              aria-selected={!value}
              className={`searchable-select-item ${!value ? 'is-selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              All {placeholder.toLowerCase().includes('user') || placeholder.toLowerCase().includes('student') || placeholder.toLowerCase().includes('teacher') ? 'users' : 'options'}
            </li>
          )}
          {filteredOptions.length === 0 ? (
            <li className="searchable-select-item is-empty">No results found</li>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`searchable-select-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

