import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileJson, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { downloadFile } from '../utils/api'

export default function ExportPanel({ jobId, stats }) {
  const [toasts, setToasts] = useState([])

  const showToast = (msg) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  const handleDownload = (format) => {
    downloadFile(jobId, format)
    showToast(`Downloading ${format.toUpperCase()}...`)
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Download buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* CSV */}
        <motion.button
          id="download-csv-btn"
          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(200,255,0,0.2)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleDownload('csv')}
          className="card flex flex-col items-center gap-3 py-8 border-accent/20 hover:border-accent/50 cursor-pointer transition-all duration-300 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
            <FileText size={24} className="text-accent" />
          </div>
          <div className="text-center">
            <p className="text-text font-semibold">Download CSV</p>
            <p className="text-xs text-muted mono mt-0.5">Comma-separated values</p>
          </div>
          <div className="flex items-center gap-2 text-xs mono text-text-dim bg-bg border border-border px-3 py-1 rounded-full">
            <Download size={12} />
            .csv
          </div>
        </motion.button>

        {/* JSON */}
        <motion.button
          id="download-json-btn"
          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(200,255,0,0.1)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleDownload('json')}
          className="card flex flex-col items-center gap-3 py-8 cursor-pointer transition-all duration-300 group hover:border-text/20"
        >
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center group-hover:border-text/20 transition-all duration-300">
            <FileJson size={24} className="text-text-dim" />
          </div>
          <div className="text-center">
            <p className="text-text font-semibold">Download JSON</p>
            <p className="text-xs text-muted mono mt-0.5">Array of records</p>
          </div>
          <div className="flex items-center gap-2 text-xs mono text-text-dim bg-bg border border-border px-3 py-1 rounded-full">
            <Download size={12} />
            .json
          </div>
        </motion.button>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="card mono text-xs space-y-1.5">
          <p className="text-muted uppercase tracking-widest mb-2 text-[10px]">Output Summary</p>
          <div className="flex justify-between">
            <span className="text-muted">Rows in output</span>
            <span className="text-text">{(stats.rows_after || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Rows removed</span>
            <span className="text-error">{(stats.rows_removed || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Duplicates removed</span>
            <span className="text-text">{(stats.duplicates_removed || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Missing values filled</span>
            <span className="text-text">{(stats.missing_filled || 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="flex items-center gap-2 bg-success/10 border border-success/30 text-success px-4 py-3 rounded-xl shadow-xl text-sm"
            >
              <CheckCircle size={16} />
              {toast.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
