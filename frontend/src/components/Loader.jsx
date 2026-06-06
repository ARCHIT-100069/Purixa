import { useState, useEffect, useRef } from 'react'

export default function Loader({ onComplete }) {
  const [pct, setPct]     = useState(0)
  const [exiting, setExiting] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    let current = 0
    const id = setInterval(() => {
      // Fast at first, slow toward the end
      const step = current < 70 ? Math.random() * 4 + 2 : Math.random() * 1.2 + 0.4
      current = Math.min(current + step, 100)
      setPct(Math.floor(current))

      if (current >= 100 && !doneRef.current) {
        doneRef.current = true
        clearInterval(id)
        // Brief pause at 100%, then slide out
        setTimeout(() => {
          setExiting(true)
          setTimeout(onComplete, 850)
        }, 380)
      }
    }, 28)
    return () => clearInterval(id)
  }, [onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        background: 'linear-gradient(140deg, #a8e8b0 0%, #c8c8c8 55%, #D8D8D8 100%)',
        transform: exiting ? 'translateY(-100%)' : 'translateY(0)',
        transition: exiting ? 'transform 0.85s cubic-bezier(0.76, 0, 0.24, 1)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Horizontal line track */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(0,0,0,0.14)' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: '#0A0A0A',
            transition: 'width 0.12s linear',
          }}
        />
      </div>

      {/* Percent counter */}
      <span
        style={{
          position: 'absolute',
          top: '50%',
          right: 32,
          transform: 'translateY(-18px)',
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          color: '#0A0A0A',
          letterSpacing: '0.1em',
        }}
      >
        {pct}%
      </span>

      {/* Wordmark — fades in past 40% */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: 32,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '2rem',
          color: '#0A0A0A',
          opacity: pct > 40 ? 1 : 0,
          transform: pct > 40 ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        Purixa
      </div>
    </div>
  )
}
