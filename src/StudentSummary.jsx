import { useEffect, useState } from 'react'
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
import { supabase } from './utils/supabase'

const CHAPTERS = ['1', '2', '3', '4']

const getScoreColor = (value) => {
  if (value >= 75) return '#2f9e44'
  if (value >= 50) return '#f0c419'
  return '#e03131'
}

function StatCard({ label, value, sub, valueColor }) {
  return (
    <div className="overview-stat">
      <h2>{label}</h2>
      <p style={valueColor ? { color: valueColor } : undefined}>{value ?? '-'}</p>
      {sub && <p className="overview-stat-sub">{sub}</p>}
    </div>
  )
}

function ChapterMasteryBars({ chapterStats }) {
  return (
    <section className="student-summary-section" aria-labelledby="chapter-mastery-title">
      <h2 id="chapter-mastery-title">Chapter Mastery</h2>
      <div className="chapter-mastery-bars">
        {CHAPTERS.map((ch) => {
          const stat = chapterStats.get(ch)
          const score = stat?.latestAvg ?? null
          const plays = stat?.totalPlays ?? 0
          const color = score !== null ? getScoreColor(score) : 'var(--border)'
          const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0

          return (
            <div key={ch} className="chapter-mastery-row">
              <span className="chapter-mastery-label">Ch. {ch}</span>
              <div className="chapter-mastery-track">
                <div
                  className="chapter-mastery-fill"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  role="progressbar"
                  aria-valuenow={score ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Chapter ${ch} latest score`}
                />
                {/* 75% threshold marker */}
                <div className="chapter-mastery-threshold" aria-hidden="true" />
              </div>
              <span className="chapter-mastery-value" style={{ color: score !== null ? color : 'var(--text)' }}>
                {score !== null ? `${score.toFixed(1)}%` : 'No plays'}
              </span>
              <span className="chapter-mastery-plays">{plays > 0 ? `${plays} play${plays !== 1 ? 's' : ''}` : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="chapter-mastery-legend">Dashed line = 75% mastery threshold</p>
    </section>
  )
}

export default function StudentSummary({ userId, userName, section = '' }) {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return

    let isMounted = true
    setIsLoading(true)
    setError('')

    const fetchStudentRecords = async () => {
      const { data, error: queryError } = await supabase
        .from('records')
        .select('record_id, corr_percent, correct_ans, total_question, time_elapsed_sec, finished_at, chapter')
        .eq('user', userId)
        .order('finished_at', { ascending: true })

      if (!isMounted) return

      if (queryError) {
        setError(queryError.message)
      } else {
        setRecords(data ?? [])
      }
      setIsLoading(false)
    }

    fetchStudentRecords()
    return () => { isMounted = false }
  }, [userId])

  if (!userId) return null
  if (isLoading) return <p className="view-hint" role="status">Loading summary for {userName}...</p>
  if (error) return <p className="records-error" role="alert">Unable to load summary: {error}</p>
  if (records.length === 0) {
    return (
      <section className="student-summary-panel" aria-labelledby="student-summary-title">
        <h2 id="student-summary-title" className="student-summary-name">
          {userName}{section ? ` - ${section}` : ''} (0 Playthroughs)
        </h2>
        <p className="view-hint">No records found for this student.</p>
      </section>
    )
  }

  // ── Compute stats ──────────────────────────────────────────────────────────

  // Chronological order (already sorted from query)
  const validScores = records.filter((r) => r.corr_percent !== null && Number.isFinite(Number(r.corr_percent)))
  const totalPlays = records.length
  const avgScore = validScores.length ? validScores.reduce((s, r) => s + Number(r.corr_percent), 0) / validScores.length : null
  const masteryCount = validScores.filter((r) => Number(r.corr_percent) >= 75).length
  const masteryRate = validScores.length ? (masteryCount / validScores.length) * 100 : null
  const avgTime = records.filter((r) => r.time_elapsed_sec !== null && Number.isFinite(Number(r.time_elapsed_sec))).reduce((acc, r, _i, arr) => acc + Number(r.time_elapsed_sec) / arr.length, 0) || null
  const totalQuestions = records.reduce((acc, r) => acc + (Number(r.total_question) || 0), 0)
  const totalPlaytimeSec = records
    .filter((r) => r.time_elapsed_sec !== null && Number.isFinite(Number(r.time_elapsed_sec)))
    .reduce((acc, r) => acc + Number(r.time_elapsed_sec), 0)

  const formatTotalPlaytime = (seconds) => {
    if (!seconds || seconds <= 0) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    if (mins === 0) return `${secs}s`
    const hours = Math.floor(mins / 60)
    const remMins = mins % 60
    if (hours === 0) return `${mins}m ${secs}s`
    return `${hours}h ${remMins}m`
  }

  // Per chapter: first and latest play
  const chapterPlays = new Map()
  for (const r of records) {
    if (r.chapter === null || r.chapter === undefined) continue
    const ch = String(r.chapter)
    if (!chapterPlays.has(ch)) chapterPlays.set(ch, [])
    chapterPlays.get(ch).push(r)
  }

  const chapterStats = new Map()
  let totalGrowthSum = 0
  let growthCount = 0

  for (const [ch, plays] of chapterPlays.entries()) {
    const first = plays[0]
    const latest = plays[plays.length - 1]
    const initScore = Number(first.corr_percent)
    const lateScore = Number(latest.corr_percent)
    const hasScores = Number.isFinite(initScore) && Number.isFinite(lateScore)

    chapterStats.set(ch, {
      chapter: `Chapter ${ch}`,
      initialAvg: hasScores ? initScore : null,
      latestAvg: hasScores ? lateScore : null,
      growth: hasScores ? lateScore - initScore : null,
      totalPlays: plays.length,
    })

    if (hasScores) {
      totalGrowthSum += lateScore - initScore
      growthCount++
    }
  }

  const growth = growthCount ? totalGrowthSum / growthCount : null

  // Best/Weakest chapter by latest avg
  const rankedChapters = Array.from(chapterStats.values()).filter((s) => s.latestAvg !== null)
  rankedChapters.sort((a, b) => b.latestAvg - a.latestAvg)
  const bestChapter = rankedChapters[0] ?? null
  const weakestChapter = rankedChapters[rankedChapters.length - 1] ?? null

  // ── Learning progression chart data ────────────────────────────────────────
  const progressionData = Array.from(chapterStats.values())
    .filter((s) => s.initialAvg !== null)
    .sort((a, b) => {
      const na = Number(a.chapter.replace(/\D/g, ''))
      const nb = Number(b.chapter.replace(/\D/g, ''))
      return na - nb
    })

  // ── Score by attempt (line chart) ─────────────────────────────────────────
  let globalAttempt = 0
  const attemptData = records
    .filter((r) => r.corr_percent !== null && Number.isFinite(Number(r.corr_percent)))
    .map((r) => {
      globalAttempt += 1
      return {
        attempt: globalAttempt,
        score: Number(Number(r.corr_percent).toFixed(1)),
        chapter: r.chapter,
        date: r.finished_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(r.finished_at)) : '',
      }
    })

  return (
    <section className="student-summary-panel" aria-labelledby="student-summary-title">
      <h2 id="student-summary-title" className="student-summary-name">
        {userName}{section ? ` - ${section}` : ''} ({totalPlays} {totalPlays === 1 ? 'Playthrough' : 'Playthroughs'})
      </h2>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="overview-stats student-summary-stats">
        <StatCard
          label="Average Score"
          value={avgScore !== null ? `${avgScore.toFixed(1)}%` : '-'}
          sub={`${totalQuestions.toLocaleString()} questions answered`}
          valueColor={avgScore !== null ? getScoreColor(avgScore) : undefined}
        />
        <StatCard
          label="Score Growth"
          value={growth !== null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : '-'}
          sub="First → latest attempt per chapter"
          valueColor={growth !== null ? (growth >= 0 ? '#2f9e44' : '#e03131') : undefined}
        />
        <StatCard
          label="Mastery Rate"
          value={masteryRate !== null ? `${masteryRate.toFixed(1)}%` : '-'}
          sub="Plays scoring ≥75%"
          valueColor={masteryRate !== null ? getScoreColor(masteryRate) : undefined}
        />
        <StatCard
          label="Avg. Time / Quiz"
          value={avgTime ? `${Math.round(avgTime)}s` : '-'}
          sub={`Total playtime: ${formatTotalPlaytime(totalPlaytimeSec)}`}
        />
      </div>

      {/* ── Chapter mastery bars ───────────────────────────────────────────── */}
      <ChapterMasteryBars chapterStats={chapterStats} />

      {/* ── Learning progression chart ────────────────────────────────────── */}
      {progressionData.length > 0 && (
        <section className="student-summary-section daily-records-section" aria-labelledby="student-progression-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <h2 id="student-progression-title" style={{ margin: 0 }}>Learning Progression by Chapter</h2>
            <span style={{ fontSize: '14px', color: 'var(--text)' }}>First Attempt vs. Latest Attempt</span>
          </div>
          <div className="daily-records-chart" role="img" aria-label="First attempt vs latest attempt by chapter">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressionData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="chapter" stroke="var(--text)" tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={48} stroke="var(--text)" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload
                    if (!item || item.growth === null) return label
                    const sign = item.growth >= 0 ? `+${item.growth.toFixed(1)}%` : `${item.growth.toFixed(1)}%`
                    return `${label} (Growth: ${sign}, Plays: ${item.totalPlays})`
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '8px', fontSize: '13px' }} />
                <Bar dataKey="initialAvg" name="First Attempt" fill="#74c0fc" radius={[4, 4, 0, 0]} />
                <Bar dataKey="latestAvg" name="Latest Attempt" fill="#2f9e44" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Score over attempts (line chart) ──────────────────────────────── */}
      {attemptData.length > 1 && (
        <section className="student-summary-section daily-records-section" aria-labelledby="student-attempts-title">
          <h2 id="student-attempts-title" style={{ marginBottom: '8px' }}>Score per Attempt</h2>
          <div className="daily-records-chart" role="img" aria-label="Score per attempt line chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attemptData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="attempt" tickFormatter={(v) => `#${v}`} stroke="var(--text)" tickLine={false} label={{ value: 'Attempt', position: 'insideBottomRight', offset: -4, fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={48} stroke="var(--text)" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Score']}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload
                    return `Attempt #${label}${item?.chapter != null ? ` · Chapter ${item.chapter}` : ''}${item?.date ? ` · ${item.date}` : ''}`
                  }}
                />
                <Line
                  type="linear"
                  dataKey="score"
                  name="Score"
                  strokeWidth={2}
                  dot={(props) => (
                    <circle cx={props.cx} cy={props.cy} r={3} fill={getScoreColor(props.payload.score)} />
                  )}
                  activeDot={(props) => (
                    <circle cx={props.cx} cy={props.cy} r={5} fill={getScoreColor(props.payload.score)} />
                  )}
                  stroke="#4169e1"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Play history ──────────────────────────────────────────────────── */}
      <section className="student-summary-section" aria-labelledby="student-history-title">
        <h2 id="student-history-title">Play History</h2>
        <div className="activity-feed">
          {[...records].reverse().map((r) => {
            const score = r.corr_percent !== null && r.corr_percent !== undefined ? Number(r.corr_percent) : null
            const correctCount = r.correct_ans !== null ? Number(r.correct_ans) : null
            const totalQ = r.total_question !== null ? Number(r.total_question) : null
            const scoreColor = score !== null ? getScoreColor(score) : 'var(--text)'
            const dateStr = r.finished_at
              ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(r.finished_at))
              : '-'
            return (
              <div key={r.record_id} className="activity-row-item">
                <div className="activity-row-main">
                  <span className="activity-feed-chapter">Ch. {r.chapter ?? '-'}</span>
                  {r.time_elapsed_sec !== null && r.time_elapsed_sec !== undefined && (
                    <span className="activity-feed-time">{r.time_elapsed_sec}s</span>
                  )}
                </div>
                <div className="activity-row-side">
                  <span className="activity-feed-date">{dateStr}</span>
                  <div
                    className="activity-feed-score"
                    style={{ backgroundColor: `${scoreColor}18`, color: scoreColor, borderColor: `${scoreColor}40` }}
                  >
                    {score !== null
                      ? correctCount !== null
                        ? `${correctCount}/${totalQ} (${score.toFixed(0)}%)`
                        : `${score.toFixed(0)}%`
                      : '-'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </section>
  )
}

