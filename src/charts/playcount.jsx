import { useEffect, useState } from 'react'
import {
	Line,
	LineChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import { supabase } from '../utils/supabase'

const formatDay = (value) => new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
}).format(new Date(value))

function PlayCount() {
	const [records, setRecords] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		let isMounted = true

		const loadRecords = async () => {
			const pageSize = 1000
			const allRecords = []
			const { data: latestRecord, error: latestError } = await supabase
				.from('records')
				.select('finished_at')
				.not('finished_at', 'is', null)
				.order('finished_at', { ascending: false })
				.limit(1)
				.maybeSingle()

			if (latestError) {
				if (isMounted) {
					setError(latestError.message)
					setIsLoading(false)
				}
				return
			}

			if (!latestRecord) {
				if (isMounted) {
					setRecords([])
					setIsLoading(false)
				}
				return
			}

			const latestTimestamp = Date.parse(latestRecord.finished_at)
			const startTimestamp = latestTimestamp - 14 * 24 * 60 * 60 * 1000

			for (let offset = 0; ; offset += pageSize) {
				const { data, error: queryError } = await supabase
					.from('records')
					.select('finished_at')
					.not('finished_at', 'is', null)
					.gte('finished_at', new Date(startTimestamp).toISOString())
					.lte('finished_at', new Date(latestTimestamp).toISOString())
					.order('finished_at', { ascending: true })
					.range(offset, offset + pageSize - 1)

				if (queryError) {
					if (isMounted) {
						setError(queryError.message)
						setIsLoading(false)
					}
					return
				}

				allRecords.push(...(data ?? []))
				if ((data ?? []).length < pageSize) break
			}

			if (!isMounted) return
			setRecords(allRecords)
			setIsLoading(false)
		}

		loadRecords()

		return () => {
			isMounted = false
		}
	}, [])

	const dailyCounts = Array.from(records.reduce((counts, record) => {
		const finishedAt = Date.parse(record.finished_at)
		if (!Number.isFinite(finishedAt)) return counts

		const day = new Date(finishedAt)
		day.setHours(0, 0, 0, 0)
		const timestamp = day.getTime()
		counts.set(timestamp, (counts.get(timestamp) ?? 0) + 1)
		return counts
	}, new Map()), ([day, count]) => ({ day, count }))

	return (
		<section className="daily-records-section" aria-labelledby="daily-records-title">
			<h2 id="daily-records-title">Play Count</h2>
			{isLoading && <p>Loading records...</p>}
			{error && <p className="records-error" role="alert">Unable to load daily records: {error}</p>}
			{!isLoading && !error && dailyCounts.length === 0 && <p>No completed records found.</p>}
			{!isLoading && !error && dailyCounts.length > 0 && (
				<div className="daily-records-chart" role="img" aria-label="Number of records per day">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={dailyCounts} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
							<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
							<XAxis
								dataKey="day"
								type="number"
								scale="time"
								domain={['dataMin', 'dataMax']}
								tickFormatter={formatDay}
								stroke="var(--text)"
								tickLine={false}
								minTickGap={24}
							/>
							<YAxis
								dataKey="count"
								allowDecimals={false}
								width={48}
								stroke="var(--text)"
								tickLine={false}
								axisLine={false}
							/>
							<Tooltip
								labelFormatter={(value) => formatDay(value)}
								formatter={(value) => [value, 'Records']}
							/>
							<Line
								type="linear"
								dataKey="count"
								name="Records"
								stroke="var(--accent)"
								strokeWidth={2}
								dot={{ r: 3, fill: 'var(--accent)' }}
								activeDot={{ r: 5 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</section>
	)
}

export default PlayCount