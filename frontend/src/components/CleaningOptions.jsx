import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Copy,
  Type,
  BarChart2,
  Calendar,
  Trash2,
  AlertTriangle,
  Wrench,
} from 'lucide-react'

const OPERATIONS = [
  {
    key: 'remove_duplicates',
    label: 'Remove Duplicates',
    description: 'Drop exact duplicate rows from the dataset',
    icon: Copy,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    key: 'handle_missing',
    label: 'Handle Missing Values',
    description: 'Fill numeric columns with mean, text with mode; drop fully empty rows',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    key: 'fix_dtypes',
    label: 'Fix Data Types',
    description: 'Auto-detect and convert numeric strings to int/float',
    icon: BarChart2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    key: 'normalize_text',
    label: 'Normalize Text',
    description: 'Trim whitespace and apply consistent lowercase to text columns',
    icon: Type,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    key: 'remove_outliers',
    label: 'Remove Outliers',
    description: 'IQR method (3× fence) — removes extreme values from numeric columns only',
    icon: Trash2,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    key: 'fix_formatting',
    label: 'Fix Formatting',
    description: 'Emails → lowercase, dates → ISO 8601, phones → digits only, names → Title Case',
    icon: Wrench,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
]

function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`
        relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0
        ${checked ? 'bg-accent' : 'bg-border'}
      `}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
          transition-transform duration-300
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

export default function CleaningOptions({ config, onChange }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPERATIONS.map((op, idx) => {
          const Icon = op.icon
          const isEnabled = config[op.key]

          return (
            <motion.div
              key={op.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`
                card-hover cursor-pointer select-none
                ${isEnabled ? 'border-accent/20 bg-surface' : ''}
              `}
              onClick={() => onChange(op.key, !isEnabled)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl ${op.bg} border ${op.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={op.color} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm mb-0.5 transition-colors ${isEnabled ? 'text-text' : 'text-text-dim'}`}>
                    {op.label}
                  </p>
                  <p className="text-xs text-muted leading-relaxed">
                    {op.description}
                  </p>
                </div>

                {/* Toggle */}
                <Toggle
                  id={`toggle-${op.key}`}
                  checked={isEnabled}
                  onChange={(e) => { e.stopPropagation(); onChange(op.key, !isEnabled) }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mt-6 justify-center">
        <button
          id="enable-all-btn"
          onClick={() => OPERATIONS.forEach(op => onChange(op.key, true))}
          className="text-xs mono text-text-dim border border-border px-4 py-2 rounded-full hover:border-accent/50 hover:text-accent transition-all"
        >
          Enable All
        </button>
        <button
          id="disable-all-btn"
          onClick={() => OPERATIONS.forEach(op => onChange(op.key, false))}
          className="text-xs mono text-text-dim border border-border px-4 py-2 rounded-full hover:border-error/50 hover:text-error transition-all"
        >
          Disable All
        </button>
      </div>
    </div>
  )
}
