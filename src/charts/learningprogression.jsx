import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function LearningProgression({ data = [], isLoading = false }) {
  if (isLoading) {
    return (
      <section className="daily-records-section" aria-labelledby="learning-progression-title">
        <h2 id="learning-progression-title">Learning Progression by Chapter</h2>
        <p>Loading progression data...</p>
      </section>
    )
  }

  if (!data || data.length === 0) {
    return (
      <section className="daily-records-section" aria-labelledby="learning-progression-title">
        <h2 id="learning-progression-title">Learning Progression by Chapter</h2>
        <p>No chapter records found to analyze improvement.</p>
      </section>
    )
  }

  return (
    <section className="daily-records-section" aria-labelledby="learning-progression-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        <h2 id="learning-progression-title" style={{ margin: 0 }}>Learning Progression by Chapter</h2>
        <span style={{ fontSize: '12px', color: 'var(--text)' }}>First Attempt vs. Latest Attempt</span>
      </div>
      <div className="daily-records-chart" role="img" aria-label="First attempt vs latest attempt by chapter">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="chapter"
              stroke="var(--text)"
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              width={48}
              stroke="var(--text)"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name) => [`${value}%`, name]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload
                if (!item) return label
                const growthSign = item.growth > 0 ? `+${item.growth}%` : `${item.growth}%`
                return `${label} (Growth: ${growthSign}, Plays: ${item.totalPlays})`
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '8px', fontSize: '13px' }}
            />
            <Bar
              dataKey="initialAvg"
              name="First Attempt"
              fill="#74c0fc"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="latestAvg"
              name="Latest Attempt"
              fill="#2f9e44"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

