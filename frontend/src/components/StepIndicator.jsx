import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Configure' },
  { id: 3, label: 'Clean' },
  { id: 4, label: 'Export' },
]

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-16">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < currentStep
        const isActive = step.id === currentStep
        const isLast = idx === STEPS.length - 1

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-500 relative
                  ${isCompleted
                    ? 'bg-accent text-black'
                    : isActive
                    ? 'bg-transparent border-2 border-accent text-accent shadow-[0_0_20px_rgba(200,255,0,0.2)]'
                    : 'bg-transparent border border-border text-muted'
                  }
                `}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span className="mono">{String(step.id).padStart(2, '0')}</span>
                )}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-accent/30"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 + 0.2 }}
                className={`
                  mt-2 text-xs tracking-wider uppercase mono
                  ${isActive ? 'text-accent' : isCompleted ? 'text-text-dim' : 'text-muted'}
                `}
              >
                {step.label}
              </motion.span>
            </div>

            {!isLast && (
              <div className="flex items-center mb-5 mx-2">
                <div className={`h-px w-16 transition-all duration-700 ${isCompleted ? 'bg-accent' : 'bg-border'}`} />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
