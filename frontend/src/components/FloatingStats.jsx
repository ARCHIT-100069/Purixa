import { useState, useEffect } from 'react'

function formatNum(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString()
}

export default function FloatingStats({ fileData, progress, status }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* Top-left: coordinates */}
      <div className="floating-stats floating-stat-tl">
        <span className="stat-label">LOCATION</span>
        <span className="stat-value">28.6441° N</span>
        <span className="stat-value">77.3910° E</span>
      </div>

      {/* Top-right: file info */}
      <div className="floating-stats floating-stat-tr" style={{ textAlign: 'right' }}>
        <span className="stat-label">ROWS</span>
        <span className="stat-value">{formatNum(fileData?.rows)}</span>
        <span className="stat-label" style={{ marginTop: 6 }}>COLS</span>
        <span className="stat-value">{formatNum(fileData?.cols)}</span>
      </div>

      {/* Bottom-right: time + status */}
      <div className="floating-stats floating-stat-br" style={{ textAlign: 'right' }}>
        <span className="stat-label">LOCAL TIME</span>
        <span className="stat-value">{time}</span>
        {status && (
          <>
            <span className="stat-label" style={{ marginTop: 6 }}>PIPELINE</span>
            <span
              className="stat-value"
              style={{ color: status === 'done' ? 'var(--color-accent)' : 'inherit' }}
            >
              {status.toUpperCase()}
              {status === 'running' ? ` ${progress}%` : ''}
            </span>
          </>
        )}
      </div>

      {/* Bottom-left: version */}
      <div className="floating-stats floating-stat-bl">
        <span className="stat-label">PURIXA</span>
        <span className="stat-value">v1.0.0</span>
      </div>
    </>
  )
}
