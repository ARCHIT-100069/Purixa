import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, AlertTriangle, X, CheckCircle2 } from 'lucide-react'
import { uploadFile } from '../utils/api'

const ACCEPTED_TYPES = {
  'text/csv': ['.csv'],
  'text/tab-separated-values': ['.tsv'],
  'application/json': ['.json'],
  'text/plain': ['.csv', '.tsv'],
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DropZone({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      setError('Unsupported file type. Please upload CSV, TSV, or JSON.')
      return
    }

    const file = acceptedFiles[0]
    if (!file) return

    setPendingFile(file)
    setUploading(true)
    setUploadProgress(0)

    try {
      const data = await uploadFile(file, (evt) => {
        if (evt.total) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      })
      onUploadSuccess(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Upload failed'
      setError(msg)
      setPendingFile(null)
    } finally {
      setUploading(false)
    }
  }, [onUploadSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Drop Area */}
        <div
          {...getRootProps()}
          id="dropzone"
          className={`
            relative rounded-3xl border-2 border-dashed p-16 text-center cursor-pointer
            transition-all duration-300 group
            ${isDragActive
              ? 'border-accent bg-accent/5 dropzone-active'
              : 'border-border bg-surface hover:border-accent/40 hover:bg-accent/[0.02]'
            }
            ${uploading ? 'opacity-70 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} id="file-input" />

          {/* Background grid pattern */}
          <div className="absolute inset-0 rounded-3xl grid-bg opacity-50" />

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {isDragActive ? (
                <motion.div
                  key="drag"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-20 h-20 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                    <Upload size={36} className="text-accent" />
                  </div>
                  <p className="text-accent text-xl font-semibold">Drop it here!</p>
                </motion.div>
              ) : uploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center">
                    <FileText size={36} className="text-accent" />
                  </div>
                  <div className="w-48">
                    <div className="flex justify-between text-xs mono text-muted mb-2">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                  <p className="text-text-dim text-sm mono">{pendingFile?.name}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center group-hover:border-accent/30 transition-all duration-300">
                    <Upload size={36} className="text-muted group-hover:text-accent/70 transition-colors duration-300" />
                  </div>

                  <div>
                    <p className="text-text text-lg font-medium mb-1">
                      Drag & drop your file here
                    </p>
                    <p className="text-text-dim text-sm">
                      or{' '}
                      <span className="text-accent underline underline-offset-2 cursor-pointer">
                        browse to upload
                      </span>
                    </p>
                  </div>

                  {/* File type badges */}
                  <div className="flex gap-2">
                    {['.csv', '.json', '.tsv'].map((ext) => (
                      <span
                        key={ext}
                        className="mono text-xs px-3 py-1 rounded-full border border-border text-muted bg-bg"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-muted mono">
                    Max recommended size: 500MB · Files &gt;50MB use chunked processing
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 flex items-center gap-3 bg-error/10 border border-error/30 rounded-xl px-4 py-3"
            >
              <AlertTriangle size={16} className="text-error flex-shrink-0" />
              <p className="text-error text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-error/60 hover:text-error"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
