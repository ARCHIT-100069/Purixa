import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Zap, RotateCcw } from 'lucide-react'

import Navbar from '../components/Navbar'
import StepIndicator from '../components/StepIndicator'
import DropZone from '../components/DropZone'
import FileStats from '../components/FileStats'
import CleaningOptions from '../components/CleaningOptions'
import ProgressBar from '../components/ProgressBar'
import CleaningLog from '../components/CleaningLog'
import DataPreview from '../components/DataPreview'
import StatsReport from '../components/StatsReport'
import ExportPanel from '../components/ExportPanel'

import { startCleaning, getPreview } from '../utils/api'
import { useCleaningJob } from '../hooks/useCleaningJob'

const DEFAULT_CONFIG = {
  remove_duplicates: true,
  handle_missing: true,
  fix_dtypes: true,
  normalize_text: true,
  remove_outliers: false,
  fix_formatting: true,
}

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 32, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -24, scale: 0.98 },
}

const PAGE_TRANSITION = {
  duration: 0.45,
  ease: [0.16, 1, 0.3, 1],
}

export default function App() {
  const [step, setStep] = useState(1)
  const [fileData, setFileData] = useState(null)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [previewData, setPreviewData] = useState(null)
  const [isStartingClean, setIsStartingClean] = useState(false)
  const [cleanError, setCleanError] = useState(null)

  const { jobId, status, progress, log, stats, error, startJob, reset } = useCleaningJob()

  const handleUploadSuccess = (data) => {
    setFileData(data)
  }

  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleStartCleaning = async () => {
    if (!fileData) return
    setIsStartingClean(true)
    setCleanError(null)
    try {
      const res = await startCleaning(fileData.file_id, config)
      startJob(res.job_id)
      setStep(3)
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to start cleaning'
      setCleanError(msg)
    } finally {
      setIsStartingClean(false)
    }
  }

  // Fetch preview when job is done
  useEffect(() => {
    if (status === 'done' && jobId && !previewData) {
      getPreview(jobId)
        .then((data) => setPreviewData(data))
        .catch((err) => console.error('Preview fetch error:', err))
    }
  }, [status, jobId, previewData])

  // Auto-advance to export when done
  useEffect(() => {
    if (status === 'done' && step === 3) {
      const timer = setTimeout(() => setStep(4), 1200)
      return () => clearTimeout(timer)
    }
  }, [status, step])

  const handleReset = () => {
    reset()
    setFileData(null)
    setConfig(DEFAULT_CONFIG)
    setPreviewData(null)
    setCleanError(null)
    setStep(1)
  }

  // Latest log message for progress bar status text
  const lastLog = log[log.length - 1] || ''

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Hero header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="display-font text-5xl sm:text-6xl font-bold text-text leading-tight mb-4">
              Clean your data.
              <br />
              <span className="italic text-text-dim">Effortlessly.</span>
            </h1>
            <p className="text-text-dim text-lg max-w-md mx-auto">
              Upload, configure, and download pristine datasets — no code required.
            </p>
          </motion.div>

          {/* Step indicator */}
          <StepIndicator currentStep={step} />

          {/* Step content */}
          <AnimatePresence mode="wait">

            {/* ─── STEP 1: UPLOAD ─── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={PAGE_TRANSITION}
              >
                <SectionHeader
                  stepNum="01"
                  title="Upload your dataset"
                  subtitle="Supports CSV, JSON, and TSV. Files over 50MB use streaming."
                />

                <DropZone onUploadSuccess={handleUploadSuccess} />

                {fileData && (
                  <>
                    <FileStats fileData={fileData} />
                    <div className="flex justify-center mt-8">
                      <motion.button
                        id="next-to-configure-btn"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setStep(2)}
                        className="btn-primary flex items-center gap-2 text-base"
                      >
                        Configure Cleaning
                        <ArrowRight size={18} />
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ─── STEP 2: CONFIGURE ─── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                variants={PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={PAGE_TRANSITION}
              >
                <SectionHeader
                  stepNum="02"
                  title="Configure operations"
                  subtitle="Toggle the cleaning operations to apply. All enabled by default."
                />

                <CleaningOptions config={config} onChange={handleConfigChange} />

                {cleanError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm text-center"
                  >
                    {cleanError}
                  </motion.div>
                )}

                <div className="flex justify-between mt-8">
                  <button
                    id="back-to-upload-btn"
                    onClick={() => setStep(1)}
                    className="btn-ghost flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <motion.button
                    id="start-cleaning-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStartCleaning}
                    disabled={isStartingClean}
                    className="btn-primary flex items-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStartingClean ? (
                      <>Starting...</>
                    ) : (
                      <>
                        <Zap size={18} />
                        Run Cleaning Pipeline
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: CLEAN ─── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                variants={PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={PAGE_TRANSITION}
              >
                <SectionHeader
                  stepNum="03"
                  title="Cleaning in progress"
                  subtitle={
                    status === 'done'
                      ? 'All done! Redirecting to export...'
                      : status === 'error'
                      ? 'An error occurred during cleaning.'
                      : 'Sit tight while Purixa processes your data.'
                  }
                />

                <div className="flex flex-col items-center gap-8">
                  <ProgressBar progress={progress} statusText={lastLog} />
                  <CleaningLog log={log} />

                  {status === 'error' && (
                    <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm">
                      {error || 'Unknown error occurred'}
                    </div>
                  )}

                  {status === 'done' && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      id="go-to-export-btn"
                      onClick={() => setStep(4)}
                      className="btn-primary flex items-center gap-2"
                    >
                      View Results
                      <ArrowRight size={18} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── STEP 4: EXPORT ─── */}
            {step === 4 && (
              <motion.div
                key="step-4"
                variants={PAGE_VARIANTS}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={PAGE_TRANSITION}
              >
                <SectionHeader
                  stepNum="04"
                  title="Preview & Export"
                  subtitle="Review the cleaned data and download your output file."
                />

                <div className="space-y-8">
                  {/* Stats report */}
                  <StatsReport
                    stats={previewData?.stats || stats}
                    summary={previewData?.summary}
                  />

                  {/* Divider */}
                  <div className="section-divider" />

                  {/* Data preview */}
                  {previewData && (
                    <>
                      <div>
                        <h2 className="text-sm text-muted uppercase tracking-widest mono mb-4">Data Preview</h2>
                        <DataPreview
                          columns={previewData.columns}
                          rows={previewData.rows}
                          totalRows={previewData.total_rows}
                          columnTypes={previewData.column_types}
                        />
                      </div>

                      {/* Divider */}
                      <div className="section-divider" />
                    </>
                  )}

                  {/* Export */}
                  <div>
                    <h2 className="text-sm text-muted uppercase tracking-widest mono mb-4 text-center">Download</h2>
                    <ExportPanel jobId={jobId} stats={previewData?.stats || stats} />
                  </div>

                  {/* Start over */}
                  <div className="flex justify-center pt-4">
                    <button
                      id="start-over-btn"
                      onClick={handleReset}
                      className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors mono"
                    >
                      <RotateCcw size={14} />
                      Start over with a new file
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-muted text-xs mono">
          Purixa · Data Cleaning, Refined ·{' '}
          <span className="text-accent">Built with FastAPI + React</span>
        </p>
      </footer>
    </div>
  )
}

function SectionHeader({ stepNum, title, subtitle }) {
  return (
    <motion.div
      className="text-center mb-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="mono text-xs text-muted tracking-widest uppercase mb-2 block">
        Step {stepNum}
      </span>
      <h2 className="display-font text-3xl sm:text-4xl font-bold text-text mb-3">
        {title}
      </h2>
      <p className="text-text-dim text-sm max-w-sm mx-auto">{subtitle}</p>
    </motion.div>
  )
}
