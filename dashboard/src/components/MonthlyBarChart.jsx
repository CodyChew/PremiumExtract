import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function MonthlyBarChart({ data }) {
  const labels = data.map(d => d.month)
  const values = data.map(d => d.pnl)
  const chartData = {
    labels,
    datasets: [
      {
        label: 'P&L',
        data: values,
        backgroundColor: values.map(v => (v >= 0 ? 'rgba(75,192,192,0.6)' : 'rgba(255,99,132,0.6)')),
      },
    ],
  }

  return <Bar data={chartData} />
}
