import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function StatCard({ label, value, mono = false }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs text-muted uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-semibold text-text ${mono ? 'mono' : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

export default function FileStats({ fileData }) {
  if (!fileData) return null

  const { filename, rows, cols, size_bytes, is_large, missing_count, duplicate_count, columns, dtypes } = fileData

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto mt-8 space-y-4"
    >
      {/* Large file warning */}
      {is_large && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3"
        >
          <AlertTriangle size={18} className="text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-warning font-medium text-sm">Large File Detected</p>
            <p className="text-warning/70 text-xs mt-0.5">
              Chunked streaming processing will be used for this file ({formatBytes(size_bytes)}).
              Processing may take longer than usual.
            </p>
          </div>
        </motion.div>
      )}

      {/* File name header */}
      <div className="card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-accent text-xs mono font-bold">
            {filename.split('.').pop()?.toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-text font-medium truncate">{filename}</p>
          <p className="text-muted text-xs mono">{formatBytes(size_bytes)}</p>
        </div>
        {is_large ? (
          <span className="ml-auto text-xs mono px-2 py-1 rounded-full bg-warning/10 border border-warning/30 text-warning">
            Large
          </span>
        ) : (
          <span className="ml-auto text-xs mono px-2 py-1 rounded-full bg-success/10 border border-success/30 text-success">
            Ready
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Rows" value={rows} mono />
        <StatCard label="Columns" value={cols} mono />
        <StatCard label="Missing" value={missing_count} mono />
        <StatCard label="Duplicates" value={duplicate_count} mono />
      </div>

      {/* Column preview */}
      {columns && columns.length > 0 && (
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-widest mb-3">Columns</p>
          <div className="flex flex-wrap gap-2">
            {columns.slice(0, 20).map((col) => {
              const dtype = dtypes?.[col] || 'text'
              const tagClass =
                dtype === 'numeric' ? 'tag-numeric' :
                dtype === 'date' ? 'tag-date' : 'tag-text'
              return (
                <span key={col} className={tagClass}>
                  {col}
                </span>
              )
            })}
            {columns.length > 20 && (
              <span className="tag border-border text-muted">
                +{columns.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
