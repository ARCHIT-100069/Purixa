import React from 'react'
import { motion } from 'framer-motion'

export default function ProgressBar({ progress, statusText }) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-text-dim">Processing</span>
        <motion.span
          key={clampedProgress}
          initial={{ scale: 1.3, color: '#c8ff00' }}
          animate={{ scale: 1, color: '#f0f0f0' }}
          className="mono text-2xl font-semibold text-text"
        >
          {clampedProgress}%
        </motion.span>
      </div>

      {/* Track */}
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-accent relative"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Shimmer */}
          {clampedProgress > 0 && clampedProgress < 100 && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </motion.div>
      </div>

      {/* Status text */}
      {statusText && (
        <motion.p
          key={statusText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs mono text-muted mt-3 text-center"
        >
          {statusText}
        </motion.p>
      )}

      {/* Done indicator */}
      {clampedProgress === 100 && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-success text-sm mt-3 font-medium"
        >
          ✓ Cleaning complete
        </motion.p>
      )}
    </div>
  )
}
