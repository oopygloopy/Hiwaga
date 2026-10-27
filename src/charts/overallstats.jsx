import { useEffect, useId, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../utils/supabase'
import SearchableSelect from '../SearchableSelect.jsx'

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
      const { data, error: queryError } = await supabase
        .from('records')
        .select('finished_at, chapter, corr_percent, user, profile:profiles!user(last_name, first_name)')
        .order('finished_at', { ascending: true })

      if (!isMounted) return

      if (queryError) {
        setError(queryError.message)
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

  // Auto-switch to 'attempt' if user was on 'finished_at' and chooses 'corr_percent'
  useEffect(() => {
    if (metric === 'corr_percent' && xAxis === 'finished_at') {
      setScoreXAxis('attempt')
    }
  }, [metric, xAxis, setScoreXAxis])

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

  const isChapterScoreProgression = xAxis === 'chapter' && metric === 'corr_percent'

  const chartRecords = (() => {
    // Specialized Chapter view for scores: First Attempt vs. Latest Attempt
    if (isChapterScoreProgression) {
      const userChapterPlays = new Map()
      for (const record of userFilteredRecords) {
        if (record.chapter === null || record.chapter === undefined) continue
        const key = `${record.user}:::${record.chapter}`
        if (!userChapterPlays.has(key)) userChapterPlays.set(key, [])
        userChapterPlays.get(key).push(record)
      }

      const chapterStats = new Map()
      for (const [key, plays] of userChapterPlays.entries()) {
        const [, chapter] = key.split(':::')
        const initialPlay = plays[0]
        const latestPlay = plays[plays.length - 1]
        const initScore = Number(initialPlay.corr_percent)
        const lateScore = Number(latestPlay.corr_percent)

        if (Number.isFinite(initScore) && Number.isFinite(lateScore)) {
          if (!chapterStats.has(chapter)) {
            chapterStats.set(chapter, { chapter, initialTotal: 0, latestTotal: 0, count: 0, totalPlays: 0 })
          }
          const stat = chapterStats.get(chapter)
          stat.initialTotal += initScore
          stat.latestTotal += lateScore
          stat.count += 1
          stat.totalPlays += plays.length
        }
      }

      return Array.from(chapterStats.values(), (stat) => ({
        chapter: `Chapter ${stat.chapter}`,
        rawChapter: stat.chapter,
        initialAvg: Number((stat.initialTotal / stat.count).toFixed(1)),
        latestAvg: Number((stat.latestTotal / stat.count).toFixed(1)),
        growth: Number(((stat.latestTotal - stat.initialTotal) / stat.count).toFixed(1)),
        totalPlays: stat.totalPlays,
      })).sort((a, b) => {
        const numA = Number(a.rawChapter)
        const numB = Number(b.rawChapter)
        if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB
        return String(a.rawChapter).localeCompare(String(b.rawChapter), undefined, { numeric: true })
      })
    }

    let sourceRecords = filteredRecords
    if (xAxis === 'attempt') {
      const userChapterMap = new Map()
      sourceRecords = filteredRecords.map((r) => {
        const key = `${r.user}:::${r.chapter}`
        const count = (userChapterMap.get(key) ?? 0) + 1
        userChapterMap.set(key, count)
        return { ...r, attempt: count }
      })
    }

    const groupedRecords = new Map()

    for (const record of sourceRecords) {
      const corrPercent = record.corr_percent === null || record.corr_percent === undefined
        ? Number.NaN
        : Number(record.corr_percent)
      if (metric === 'corr_percent' && !Number.isFinite(corrPercent)) continue

      let key
      let axisValue

      if (xAxis === 'chapter') {
        if (record.chapter === null || record.chapter === undefined) continue
        key = String(record.chapter)
        axisValue = `Chapter ${record.chapter}`
      } else if (xAxis === 'attempt') {
        if (!record.attempt) continue
        key = String(record.attempt)
        axisValue = `Attempt ${record.attempt}`
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
        attemptNumber: Number(key),
        corrPercentTotal: 0,
        recordCount: 0,
      }
      if (Number.isFinite(corrPercent)) groupedRecord.corrPercentTotal += corrPercent
      groupedRecord.recordCount += 1
      groupedRecords.set(key, groupedRecord)
    }

    const chartRecords = Array.from(groupedRecords.values(), (groupedRecord) => ({
      [xAxis]: groupedRecord[xAxis],
      attemptNumber: groupedRecord.attemptNumber,
      [metric]: metric === 'corr_percent'
        ? Number((groupedRecord.corrPercentTotal / groupedRecord.recordCount).toFixed(1))
        : groupedRecord.recordCount,
    }))

    if (xAxis === 'chapter') {
      chartRecords.sort((first, second) => {
        const firstNumber = Number(String(first.chapter).replace(/\D/g, ''))
        const secondNumber = Number(String(second.chapter).replace(/\D/g, ''))
        if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
          return firstNumber - secondNumber
        }
        return String(first.chapter).localeCompare(String(second.chapter), undefined, { numeric: true })
      })
    } else if (xAxis === 'attempt') {
      chartRecords.sort((first, second) => first.attemptNumber - second.attemptNumber)
    }

    return chartRecords
  })()

  const Chart = (xAxis === 'chapter') ? BarChart : LineChart
  const firstScoreX = chartRecords[0]?.finished_at
  const lastScoreX = chartRecords.at(-1)?.finished_at
  const scoreRange = lastScoreX - firstScoreX

  const lineGradientStops = (metric === 'corr_percent' && xAxis !== 'chapter') ? chartRecords.flatMap((record, index) => {
    const offset = xAxis === 'finished_at'
      ? (scoreRange > 0 ? (record.finished_at - firstScoreX) / scoreRange : 0)
      : (chartRecords.length > 1 ? index / (chartRecords.length - 1) : 0)
    const color = getScoreColor(record[metric])

    if (index === 0) return [{ offset, color }]

    return [
      { offset, color: getScoreColor(chartRecords[index - 1][metric]) },
      { offset, color },
    ]
  }) : []

  return (
    <section className="overall-stats-section" aria-labelledby="overall-stats-title">
      <h2 id="overall-stats-title">{metric === 'corr_percent' ? 'Learning Progression & Scores' : 'Total Records'}</h2>
      <div className="overall-stats-filters">
        <div className="overall-stats-controls">
          <label htmlFor="overall-stats-metric">Show</label>
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
          <label htmlFor="overall-stats-user">for</label>
          <SearchableSelect
            id="overall-stats-user"
            options={userOptions}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder="All users"
          />
        </div>

        <div className="overall-stats-controls">
          <label htmlFor="overall-stats-x-axis">by</label>
          <select
            id="overall-stats-x-axis"
            value={xAxis}
            onChange={(event) => setScoreXAxis(event.target.value)}
          >
            {metric === 'corr_percent' ? (
              <>
                <option value="attempt">Attempts (Learning Curve)</option>
                <option value="chapter">Chapters (1st vs. Latest)</option>
              </>
            ) : (
              <>
                <option value="finished_at">Time (Calendar)</option>
                <option value="chapter">Chapters</option>
                <option value="attempt">Attempts</option>
              </>
            )}
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
          aria-label={`${metric === 'corr_percent' ? 'Overall stats' : 'Total records'} by ${xAxis}`}
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
                dataKey={isChapterScoreProgression ? undefined : metric}
                domain={metric === 'corr_percent' ? [0, 100] : [0, 'auto']}
                width={48}
                tickFormatter={(value) => metric === 'corr_percent' ? `${value}%` : value}
                stroke="var(--text)"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                labelFormatter={(value, payload) => {
                  if (xAxis === 'finished_at') {
                    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
                  }
                  if (isChapterScoreProgression) {
                    const item = payload?.[0]?.payload
                    if (!item) return String(value)
                    const growthSign = item.growth > 0 ? `+${item.growth}%` : `${item.growth}%`
                    return `${value} (Growth: ${growthSign}, Plays: ${item.totalPlays})`
                  }
                  return String(value)
                }}
                formatter={(value, name) => {
                  if (metric === 'corr_percent') {
                    return [`${Number(value).toFixed(1)}%`, name === 'corr_percent' ? 'Score' : name]
                  }
                  return [value, 'Records']
                }}
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
                isChapterScoreProgression ? (
                  <>
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '8px', fontSize: '13px' }}
                    />
                    <Bar dataKey="initialAvg" name="First Attempt" fill="#74c0fc" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="latestAvg" name="Latest Attempt" fill="#2f9e44" radius={[3, 3, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey={metric} name="Records">
                    {chartRecords.map((record, index) => (
                      <Cell
                        key={`${record.chapter}-${index}`}
                        fill="var(--accent)"
                      />
                    ))}
                  </Bar>
                )
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
                      fill={metric === 'corr_percent' ? getScoreColor(props.payload[metric]) : 'var(--accent)'}
                    />
                  )}
                  activeDot={(props) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={metric === 'corr_percent' ? getScoreColor(props.payload[metric]) : 'var(--accent)'}
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
