import { useEffect, useId, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../utils/supabase'

const getScoreColor = (value) => {
  if (value >= 75) return '#2f9e44'
  if (value >= 50) return '#f0c419'
  return '#e03131'
}

const formatFinishedAt = (value) => new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(value))

function OverallStats({ xAxis, setScoreXAxis, metric, setMetric }) {
  const gradientId = `overall-stats-line-${useId().replaceAll(':', '')}`
  const [records, setRecords] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [timeWindow, setTimeWindow] = useState({ days: 0, reference: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadRecords = async () => {
      const { data, error } = await supabase
        .from('records')
        .select('finished_at, chapter, corr_percent, user, profile:profiles!user(last_name, first_name)')
        .order('finished_at', { ascending: true })

      if (!isMounted) return

      if (error) {
        setError(error.message)
      } else {
        setRecords(data ?? [])
      }

      setIsLoading(false)
    }

    loadRecords()

    return () => {
      isMounted = false
    }
  }, [])

  const userOptions = Array.from(new Map(
    records
      .filter((record) => record.user !== null && record.user !== undefined && String(record.user) !== '')
      .map((record) => {
        const value = String(record.user)
        const lastName = record.profile?.last_name
        const firstName = record.profile?.first_name
        const label = [lastName, firstName].filter(Boolean).join(', ') || value

        return [value, { value, label }]
      }),
  ).values()).sort((first, second) => first.label.localeCompare(second.label))

  const userFilteredRecords = selectedUser
    ? records.filter((record) => String(record.user) === selectedUser)
    : records
  const filteredRecords = xAxis === 'finished_at' && timeWindow.days > 0
    ? userFilteredRecords.filter((record) => {
      const finishedAt = Date.parse(record.finished_at)
      return Number.isFinite(finishedAt)
        && finishedAt >= timeWindow.reference - timeWindow.days * 24 * 60 * 60 * 1000
    })
    : userFilteredRecords

  const chartRecords = (() => {
    const groupedRecords = new Map()

    for (const record of filteredRecords) {
      const corrPercent = record.corr_percent === null || record.corr_percent === undefined
        ? Number.NaN
        : Number(record.corr_percent)
      if (metric === 'corr_percent' && !Number.isFinite(corrPercent)) continue

      let key
      let axisValue

      if (xAxis === 'chapter') {
        if (record.chapter === null || record.chapter === undefined) continue
        key = String(record.chapter)
        axisValue = record.chapter
      } else {
        const finishedAt = Date.parse(record.finished_at)
        if (!Number.isFinite(finishedAt)) continue

        const finishedDay = new Date(finishedAt)
        finishedDay.setHours(0, 0, 0, 0)
        key = String(finishedDay.getTime())
        axisValue = finishedDay.getTime()
      }

      const groupedRecord = groupedRecords.get(key) ?? {
        [xAxis]: axisValue,
        corrPercentTotal: 0,
        recordCount: 0,
      }
      if (Number.isFinite(corrPercent)) groupedRecord.corrPercentTotal += corrPercent
      groupedRecord.recordCount += 1
      groupedRecords.set(key, groupedRecord)
    }

    const chartRecords = Array.from(groupedRecords.values(), (groupedRecord) => ({
      [xAxis]: groupedRecord[xAxis],
      [metric]: metric === 'corr_percent'
        ? groupedRecord.corrPercentTotal / groupedRecord.recordCount
        : groupedRecord.recordCount,
    }))
    if (xAxis === 'chapter') {
      chartRecords.sort((first, second) => {
        const firstNumber = Number(first.chapter)
        const secondNumber = Number(second.chapter)
        if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
          return firstNumber - secondNumber
        }
        return String(first.chapter).localeCompare(String(second.chapter), undefined, { numeric: true })
      })
    }

    return chartRecords
  })()
  const Chart = xAxis === 'chapter' ? BarChart : LineChart
  const firstScoreX = chartRecords[0]?.finished_at
  const lastScoreX = chartRecords.at(-1)?.finished_at
  const scoreRange = lastScoreX - firstScoreX
  const lineGradientStops = metric === 'corr_percent' ? chartRecords.flatMap((record, index) => {
    const offset = scoreRange > 0 ? (record.finished_at - firstScoreX) / scoreRange : 0
    const color = getScoreColor(record.corr_percent)

    if (index === 0) return [{ offset, color }]

    return [
      { offset, color: getScoreColor(chartRecords[index - 1].corr_percent) },
      { offset, color },
    ]
  }) : []

  return (
    <section className="overall-stats-section" aria-labelledby="overall-stats-title">
      <h2 id="overall-stats-title">{metric === 'corr_percent' ? 'Overall Stats' : 'Total Records'}</h2>
      <div className="overall-stats-filters">
        <div className="overall-stats-controls">
          <label htmlFor="overall-stats-metric">Show the</label>
          <select
            id="overall-stats-metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
          >
            <option value="corr_percent">Score</option>
            <option value="total_records">Total records</option>
          </select>
        </div>
        <div className="overall-stats-user-filter">
          <label htmlFor="overall-stats-user">of</label>
          <select
            id="overall-stats-user"
            value={selectedUser}
            onChange={(event) => setSelectedUser(event.target.value)}
          >
            <option value="">All users</option>
            {userOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        
        <div className="overall-stats-controls">
          <label htmlFor="overall-stats-x-axis">over</label>
          <select
            id="overall-stats-x-axis"
            value={xAxis}
            onChange={(event) => setScoreXAxis(event.target.value)}
          >
            <option value="finished_at">Time</option>
            <option value="chapter">Chapters</option>
          </select>
        </div>
        {xAxis === 'finished_at' && (
          <div className="overall-stats-time-filter">
            <label htmlFor="overall-stats-days-ago">from</label>
            <input
              id="overall-stats-days-ago"
              type="range"
              min="0"
              max="365"
              value={timeWindow.days}
              onChange={(event) => setTimeWindow({ days: Number(event.target.value), reference: Date.now() })}
              aria-label="Days of chart history to show"
            />
            <label htmlFor="overall-stats-days-ago">{timeWindow.days === 0 ? 'All time' : `${timeWindow.days} days ago`}</label>
          </div>
        )}
      </div>
      {isLoading && <p>Loading scores...</p>}
      {error && <p className="records-error" role="alert">Unable to load scores: {error}</p>}
      {!isLoading && !error && chartRecords.length === 0 && <p>No completed records found.</p>}
      {!isLoading && !error && chartRecords.length > 0 && (
        <div
          className="overall-stats-chart"
          role="img"
          aria-label={`${metric === 'corr_percent' ? 'Overall stats' : 'Total records'} by ${xAxis === 'chapter' ? 'chapter' : 'completion date'}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={chartRecords} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey={xAxis}
                type={xAxis === 'finished_at' ? 'number' : 'category'}
                scale={xAxis === 'finished_at' ? 'time' : undefined}
                domain={xAxis === 'finished_at' ? ['dataMin', 'dataMax'] : undefined}
                tickFormatter={xAxis === 'finished_at' ? formatFinishedAt : undefined}
                stroke="var(--text)"
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                dataKey={metric}
                domain={metric === 'corr_percent' ? [0, 100] : [0, 'auto']}
                width={48}
                tickFormatter={(value) => metric === 'corr_percent' ? `${value}%` : value}
                stroke="var(--text)"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                labelFormatter={(value) => xAxis === 'finished_at'
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
                  : `Chapter ${value}`}
                formatter={(value) => metric === 'corr_percent'
                  ? [`${value}%`, 'Score']
                  : [value, 'Records']}
              />
              {xAxis !== 'chapter' && metric === 'corr_percent' && (
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                    {lineGradientStops.map(({ offset, color }, index) => (
                      <stop key={`${offset}-${index}`} offset={offset} stopColor={color} />
                    ))}
                  </linearGradient>
                </defs>
              )}
              {xAxis === 'chapter' ? (
                <Bar dataKey={metric} name={metric === 'corr_percent' ? 'Score' : 'Records'}>
                  {chartRecords.map((record, index) => (
                    <Cell
                      key={`${record.chapter}-${index}`}
                      fill={metric === 'corr_percent' ? getScoreColor(record.corr_percent) : 'var(--accent)'}
                    />
                  ))}
                </Bar>
              ) : (
                <Line
                  type="linear"
                  dataKey={metric}
                  name={metric === 'corr_percent' ? 'Score' : 'Records'}
                  stroke={metric === 'corr_percent' ? `url(#${gradientId})` : 'var(--accent)'}
                  strokeWidth={2}
                  dot={(props) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill={metric === 'corr_percent' ? getScoreColor(props.payload.corr_percent) : 'var(--accent)'}
                    />
                  )}
                  activeDot={(props) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={metric === 'corr_percent' ? getScoreColor(props.payload.corr_percent) : 'var(--accent)'}
                    />
                  )}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default OverallStats