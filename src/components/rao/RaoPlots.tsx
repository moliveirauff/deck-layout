import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { RaoEntry } from '../../types/database'

type Props = {
  entries: RaoEntry[]
}

type PlotTab = 'heave' | 'roll' | 'pitch'

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

const DIRECTION_LABELS: Record<number, string> = {
  0: '0° Head',
  45: '45° Bow Q.',
  90: '90° Beam S.',
  135: '135° Stern Q.',
  180: '180° Following',
  225: '225° Stern Q.P',
  270: '270° Beam P.',
  315: '315° Bow Q.P',
}

function dirLabel(deg: number): string {
  return DIRECTION_LABELS[deg] ?? `${deg}°`
}

export function RaoPlots({ entries }: Props) {
  const [tab, setTab] = useState<PlotTab>('heave')

  // Get sorted unique directions
  const directions = useMemo(() => {
    const set = new Set(entries.map((e) => e.wave_direction_deg))
    return [...set].sort((a, b) => a - b)
  }, [entries])

  // Build chart data: one row per period, one column per direction
  const chartData = useMemo(() => {
    const periodMap = new Map<number, Record<string, number>>()
    for (const e of entries) {
      const key = e.wave_period_s
      const row = periodMap.get(key) ?? { period: key }
      const fieldKey = `d${e.wave_direction_deg}`
      if (tab === 'heave') row[fieldKey] = e.heave_amplitude_m_per_m
      else if (tab === 'roll') row[fieldKey] = e.roll_amplitude_deg_per_m
      else row[fieldKey] = e.pitch_amplitude_deg_per_m
      periodMap.set(key, row)
    }
    return [...periodMap.values()].sort((a, b) => a.period - b.period)
  }, [entries, tab])

  const yLabel = tab === 'heave' ? 'Amplitude (m/m)' : 'Amplitude (deg/m)'
  const tabs: PlotTab[] = ['heave', 'roll', 'pitch']

  if (entries.length === 0) {
    return (
      <div className="rounded border border-gray-200 px-4 py-8 text-center text-xs text-gray-400">
        Save RAO data to see plots
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" label={{ value: 'Period (s)', position: 'insideBottom', offset: -2, fontSize: 11 }} tick={{ fontSize: 10 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 0, fontSize: 11 }} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {directions.map((dir, i) => (
            <Line
              key={dir}
              type="monotone"
              dataKey={`d${dir}`}
              name={dirLabel(dir)}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
