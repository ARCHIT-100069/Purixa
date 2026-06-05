import React from 'react'
import { motion } from 'framer-motion'

function getTypeClass(type) {
  if (type === 'numeric') return 'tag-numeric'
  if (type === 'date') return 'tag-date'
  return 'tag-text'
}

export default function DataPreview({ columns, rows, totalRows, columnTypes }) {
  if (!columns || !rows) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-dim">
          Showing first <span className="text-accent mono">{rows.length}</span> of{' '}
          <span className="text-text mono">{totalRows?.toLocaleString()}</span> rows
        </span>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table id="preview-table" className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface sticky top-0">
                <th className="text-left px-4 py-3 text-muted mono font-normal w-10">#</th>
                {columns.map((col) => (
                  <th key={col} className="text-left px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-text-dim font-medium">{col}</span>
                      <span className={getTypeClass(columnTypes?.[col] || 'text')}>
                        {columnTypes?.[col] || 'text'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <motion.tr
                  key={rowIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rowIdx * 0.02 }}
                  className={`border-b border-border/50 ${rowIdx % 2 === 0 ? 'bg-bg' : 'bg-surface/50'} hover:bg-accent/5 transition-colors`}
                >
                  <td className="px-4 py-2.5 text-muted mono">{rowIdx + 1}</td>
                  {columns.map((col) => {
                    const val = row[col]
                    return (
                      <td
                        key={col}
                        className="px-4 py-2.5 max-w-[200px] truncate mono text-text-dim"
                        title={val != null ? String(val) : ''}
                      >
                        {val == null ? (
                          <span className="text-muted/50 italic">null</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    )
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
