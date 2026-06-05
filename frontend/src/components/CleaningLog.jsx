import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal } from 'lucide-react'

function getLineClass(line) {
  if (line.startsWith('✓')) return 'text-success'
  if (line.startsWith('⟳')) return 'text-warning'
  if (line.startsWith('✗')) return 'text-error'
  return 'text-text-dim'
}

export default function CleaningLog({ log }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [log])

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Terminal size={14} className="text-muted" />
        <span className="text-xs mono text-muted uppercase tracking-widest">Cleaning Log</span>
        <span className="ml-auto text-xs mono text-muted">{log.length} events</span>
      </div>

      <div
        id="cleaning-log"
        className="bg-bg border border-border rounded-2xl p-4 h-64 overflow-y-auto mono text-xs"
        style={{ scrollbarWidth: 'thin' }}
      >
        {log.length === 0 ? (
          <p className="text-muted italic">Waiting for pipeline to start...</p>
        ) : (
          <AnimatePresence initial={false}>
            {log.map((line, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className={`py-0.5 ${getLineClass(line)}`}
              >
                <span className="text-muted mr-3 select-none">{String(idx + 1).padStart(3, '0')}</span>
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
