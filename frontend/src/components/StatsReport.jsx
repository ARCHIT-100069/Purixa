import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!target) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}

function CounterStat({ label, value, accent = false }) {
  const animated = useAnimatedCounter(value || 0)
  return (
    <div className="text-center">
      <motion.p
        className={`text-3xl font-bold mono ${accent ? 'text-accent' : 'text-text'}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {animated.toLocaleString()}
      </motion.p>
      <p className="text-xs text-muted uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

export default function StatsReport({ stats, summary }) {
  if (!stats) return null

  const rowsRemoved = (stats.rows_before || 0) - (stats.rows_after || 0)
  const pctRetained = stats.rows_before
    ? Math.round((stats.rows_after / stats.rows_before) * 100)
    : 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Before / After comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Before</p>
          <motion.p
            className="text-4xl font-bold mono text-text-dim"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {useAnimatedCounterDisplay(stats.rows_before)}
          </motion.p>
          <p className="text-xs text-muted mt-1">rows</p>
        </div>
        <div className="card text-center border-accent/20">
          <p className="text-xs text-muted uppercase tracking-widest mb-2">After</p>
          <motion.p
            className="text-4xl font-bold mono text-accent"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {useAnimatedCounterDisplay(stats.rows_after)}
          </motion.p>
          <p className="text-xs text-muted mt-1">rows · {pctRetained}% retained</p>
        </div>
      </div>

      {/* Detailed stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-xl font-semibold mono text-red-400">{(stats.rows_removed || 0).toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Rows Removed</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-semibold mono text-purple-400">{(stats.duplicates_removed || 0).toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Duplicates</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-semibold mono text-amber-400">{(stats.missing_filled || 0).toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Missing Filled</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-semibold mono text-orange-400">{(stats.outliers_removed || 0).toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Outliers</p>
        </div>
      </div>

      {/* Summary bullets */}
      {summary && summary.length > 0 && (
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-widest mb-3">Summary</p>
          <ul className="space-y-2">
            {summary.map((item, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-2 text-sm text-text-dim"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

// Helper hook used inline
function useAnimatedCounterDisplay(target) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    const duration = 1200
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return value.toLocaleString()
}
