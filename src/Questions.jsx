import { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import PaginationControls from './PaginationControls.jsx'
import { formatCell } from './utils/formatters'

const columnLabels = {
  question: 'Question',
  right_answer: 'Right Answer',
  wrong_answers: 'Wrong Answers',
}

export default function Questions() {
  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [dialog, setDialog] = useState('')
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [questionFields, setQuestionFields] = useState({ question: '', right_answer: '', wrong_answers: '' })
  const [mutationError, setMutationError] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadQuestions = async () => {
      setIsLoading(true)
      setError('')

      const { data, error: queryError } = await supabase.from('questions').select('*')

      if (!isMounted) return

      if (queryError) {
        setError(queryError.message)
      } else {
        setQuestions(data ?? [])
      }

      setIsLoading(false)
    }

    loadQuestions()

    return () => {
      isMounted = false
    }
  }, [])

  const columns = questions.reduce((allColumns, question) => {
    Object.keys(question).forEach((column) => {
      if (column !== 'id' && !allColumns.includes(column)) allColumns.push(column)
    })
    return allColumns
  }, [])
  const pageCount = Math.max(1, Math.ceil(questions.length / 10))
  const page = Math.min(currentPage, pageCount)
  const pageQuestions = questions.slice((page - 1) * 10, page * 10)

  const closeDialog = () => {
    setDialog('')
    setSelectedQuestionId('')
    setQuestionFields({ question: '', right_answer: '', wrong_answers: '' })
    setMutationError('')
    setIsDeleteConfirmed(false)
  }

  const openEditDialog = () => {
    setMutationError('')
    setSelectedQuestionId('')
    setQuestionFields({ question: '', right_answer: '', wrong_answers: '' })
    setDialog('edit')
  }

  const handleQuestionSelection = (event) => {
    const questionId = event.target.value
    setSelectedQuestionId(questionId)
    setQuestionFields({ question: '', right_answer: '', wrong_answers: '' })
  }

  const handleSaveQuestion = async (event) => {
    event.preventDefault()
    setMutationError('')
    setIsMutating(true)

    const questionData = {}
    const question = questionFields.question.trim()
    const rightAnswer = questionFields.right_answer.trim()
    const wrongAnswers = questionFields.wrong_answers.trim()

    if (dialog === 'add' || question) questionData.question = question
    if (dialog === 'add' || rightAnswer) questionData.right_answer = rightAnswer
    if (dialog === 'add' || wrongAnswers) {
      questionData.wrong_answers = questionFields.wrong_answers.split('\n').map((answer) => answer.trim()).filter(Boolean)
    }

    if (dialog === 'edit' && Object.keys(questionData).length === 0) {
      setMutationError('Enter at least one field to update.')
      setIsMutating(false)
      return
    }

    try {
      if (dialog === 'add') {
        const { error: insertError } = await supabase.from('questions').insert([questionData])
        if (insertError) throw insertError
      } else if (dialog === 'edit') {
        const { error: updateError } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', selectedQuestionId)
        if (updateError) throw updateError
      }

      const { data: updatedQuestions, error: reloadError } = await supabase.from('questions').select('*')
      if (reloadError) throw reloadError

      setQuestions(updatedQuestions ?? [])
      closeDialog()
    } catch (saveError) {
      setMutationError(saveError?.message || 'Unable to save question.')
    } finally {
      setIsMutating(false)
    }
  }

  const handleDeleteQuestion = async (event) => {
    event.preventDefault()
    if (!selectedQuestionId) {
      setMutationError('Select a question to delete.')
      return
    }
    if (!isDeleteConfirmed) {
      setMutationError('Please confirm deletion.')
      return
    }

    setMutationError('')
    setIsMutating(true)

    try {
      const { error: deleteError } = await supabase.from('questions').delete().eq('id', selectedQuestionId)
      if (deleteError) throw deleteError

      const { data: updatedQuestions, error: reloadError } = await supabase.from('questions').select('*')
      if (reloadError) throw reloadError

      setQuestions(updatedQuestions ?? [])
      closeDialog()
    } catch (removeError) {
      setMutationError(removeError?.message || 'Unable to delete question.')
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <div className="dashboard-content">
      <p className="view-hint">Manages the questions used within the Hiwaga mobile game.</p>
      <div className="users-view-toolbar">
        <div className="user-management-actions">
          <button className="add-user-button" type="button" onClick={() => {
            setMutationError('')
            setQuestionFields({ question: '', right_answer: '', wrong_answers: '' })
            setDialog('add')
          }}>
            Add question
          </button>
          <button className="add-user-button" type="button" onClick={openEditDialog}>
            Edit question
          </button>
          <button className="delete-user-button" type="button" onClick={() => {
            setMutationError('')
            setSelectedQuestionId('')
            setIsDeleteConfirmed(false)
            setDialog('delete')
          }}>
            Delete question
          </button>
        </div>
      </div>
      {isLoading && <p>Loading questions...</p>}
      {error && <p className="records-error" role="alert">Unable to load questions: {error}</p>}
      {!isLoading && !error && questions.length === 0 && <p>No questions found.</p>}
      {!isLoading && !error && questions.length > 0 && (
        <>
          <PaginationControls
            page={page}
            pageCount={pageCount}
            rowCount={questions.length}
            onPageChange={setCurrentPage}
          />
          <div className="records-table-wrapper">
            <table className="records-table">
              <thead>
                <tr>{columns.map((column) => <th key={column}>{columnLabels[column] ?? column}</th>)}</tr>
              </thead>
              <tbody>
                {pageQuestions.map((question, index) => (
                  <tr key={question.id ?? (page - 1) * 10 + index}>
                    {columns.map((column) => <td key={column}>{formatCell(question[column])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {(dialog === 'add' || dialog === 'edit') && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutating) closeDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isMutating) closeDialog()
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="question-dialog-title">
            <header className="add-user-dialog-header">
              <h2 id="question-dialog-title">{dialog === 'add' ? 'Add question' : 'Edit question'}</h2>
              <button className="add-user-close" type="button" aria-label="Close dialog" disabled={isMutating} onClick={closeDialog}>
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleSaveQuestion}>
              {dialog === 'edit' && (
                <div className="field-group edit-user-profile-select">
                  <label htmlFor="edit-question-id">Question</label>
                  <select id="edit-question-id" value={selectedQuestionId} onChange={handleQuestionSelection} required>
                    <option value="" disabled>Select a question</option>
                    {questions.map((question) => (
                      <option key={question.id} value={question.id}>{question.question}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field-group edit-user-profile-select">
                <label htmlFor="question-text">Question</label>
                <input
                  id="question-text"
                  type="text"
                  placeholder={dialog === 'edit' ? 'Leave unchanged' : undefined}
                  value={questionFields.question}
                  onChange={(event) => setQuestionFields({ ...questionFields, question: event.target.value })}
                  required={dialog === 'add'}
                />
              </div>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="question-right-answer">Right answer</label>
                <input
                  id="question-right-answer"
                  type="text"
                  placeholder={dialog === 'edit' ? 'Leave unchanged' : undefined}
                  value={questionFields.right_answer}
                  onChange={(event) => setQuestionFields({ ...questionFields, right_answer: event.target.value })}
                  required={dialog === 'add'}
                />
              </div>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="question-wrong-answers">Wrong answers</label>
                <small className="question-field-hint">Entries are separated on new lines.</small>
                <textarea
                  id="question-wrong-answers"
                  rows="4"
                  placeholder={dialog === 'edit' ? 'Leave unchanged' : undefined}
                  value={questionFields.wrong_answers}
                  onChange={(event) => setQuestionFields({ ...questionFields, wrong_answers: event.target.value })}
                />
              </div>
              {mutationError && <p className="add-user-error" role="alert">Unable to save question: {mutationError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isMutating} onClick={closeDialog}>Cancel</button>
                <button type="submit" disabled={isMutating || (dialog === 'edit' && !selectedQuestionId)}>
                  {isMutating ? 'Saving...' : dialog === 'add' ? 'Add question' : 'Save changes'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {dialog === 'delete' && (
        <div
          className="add-user-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutating) closeDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isMutating) closeDialog()
          }}
        >
          <section className="add-user-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-question-title">
            <header className="add-user-dialog-header">
              <h2 id="delete-question-title">Delete question</h2>
              <button className="add-user-close" type="button" aria-label="Close dialog" disabled={isMutating} onClick={closeDialog}>
                ×
              </button>
            </header>
            <form className="add-user-form" onSubmit={handleDeleteQuestion}>
              <div className="field-group edit-user-profile-select">
                <label htmlFor="delete-question-id">Question</label>
                <select
                  id="delete-question-id"
                  value={selectedQuestionId}
                  onChange={(event) => {
                    setSelectedQuestionId(event.target.value)
                    setIsDeleteConfirmed(false)
                    setMutationError('')
                  }}
                  required
                >
                  <option value="" disabled>Select a question</option>
                  {questions.map((question) => (
                    <option key={question.id} value={question.id}>{question.question}</option>
                  ))}
                </select>
              </div>
              {selectedQuestionId && (
                <p className="delete-user-warning">
                  This permanently deletes "{questions.find((question) => String(question.id) === selectedQuestionId)?.question}" and cannot be undone.
                </p>
              )}
              <label className="delete-user-confirmation">
                <input
                  type="checkbox"
                  checked={isDeleteConfirmed}
                  onChange={(event) => setIsDeleteConfirmed(event.target.checked)}
                />
                <span>I understand this action is permanent.</span>
              </label>
              {mutationError && <p className="add-user-error" role="alert">Unable to delete question: {mutationError}</p>}
              <footer className="add-user-form-actions">
                <button type="button" disabled={isMutating} onClick={closeDialog}>Cancel</button>
                <button className="delete-user-confirm-button" type="submit" disabled={isMutating || !selectedQuestionId || !isDeleteConfirmed}>
                  {isMutating ? 'Deleting...' : 'Delete permanently'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
