import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function GradeDistribution({ students = [] }) {
  if (!students || students.length === 0) return null

  // DepEd Grading / Mastery Brackets
  const brackets = [
    { label: '<75%', desc: 'Did Not Meet Expectations', min: 0, max: 74.999, color: '#e03131', count: 0 },
    { label: '75-79%', desc: 'Fairly Satisfactory', min: 75, max: 79.999, color: '#f59f00', count: 0 },
    { label: '80-84%', desc: 'Satisfactory', min: 80, max: 84.999, color: '#fab005', count: 0 },
    { label: '85-89%', desc: 'Very Satisfactory', min: 85, max: 89.999, color: '#40c057', count: 0 },
    { label: '90-100%', desc: 'Outstanding', min: 90, max: 100, color: '#2b8a3e', count: 0 },
  ]

  let validCount = 0
  for (const s of students) {
    if (s.averageGrade !== null && s.averageGrade !== undefined && Number.isFinite(s.averageGrade)) {
      validCount += 1
      for (const b of brackets) {
        if (s.averageGrade >= b.min && s.averageGrade <= b.max) {
          b.count += 1
          break
        }
      }
    }
  }

  if (validCount === 0) return null

  const data = brackets.map((b) => ({
    ...b,
    percentage: ((b.count / validCount) * 100).toFixed(1),
  }))

  return (
    <section className="grade-distribution-section" aria-labelledby="grade-distribution-title">
      <div className="grade-distribution-header">
        <h2 id="grade-distribution-title">Grade Distribution</h2>
        <span className="grade-distribution-subtitle">Mastery Brackets ({validCount} students)</span>
      </div>

      <div className="grade-distribution-chart" role="img" aria-label="Student grade distribution by DepEd standards">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text)" tickLine={false} />
            <YAxis allowDecimals={false} stroke="var(--text)" tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value, _name, item) => [
                `${value} students (${item.payload.percentage}%)`,
                item.payload.desc,
              ]}
              labelFormatter={(label) => `Bracket: ${label}`}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grade-distribution-legend">
        {data.map((b) => (
          <div key={b.label} className="grade-distribution-pill">
            <span className="grade-distribution-dot" style={{ backgroundColor: b.color }} />
            <span className="grade-distribution-desc">{b.desc} ({b.label}):</span>
            <strong>{b.count}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

