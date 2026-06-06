import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Visual components (no GSAP)
import Loader        from '../components/Loader'
import CustomCursor  from '../components/CustomCursor'
import VerticalNav   from '../components/VerticalNav'
import FloatingStats from '../components/FloatingStats'
import DataWireframe from '../components/DataWireframe'

// Functional components
import DropZone        from '../components/DropZone'
import FileStats       from '../components/FileStats'
import CleaningOptions from '../components/CleaningOptions'
import ProgressBar     from '../components/ProgressBar'
import CleaningLog     from '../components/CleaningLog'
import DataPreview     from '../components/DataPreview'
import StatsReport     from '../components/StatsReport'
import ExportPanel     from '../components/ExportPanel'

import { useCleaningJob } from '../hooks/useCleaningJob'
import { startCleaning, getPreview } from '../utils/api'

// ── Constants ──────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  remove_duplicates: true,
  handle_missing:    true,
  fix_dtypes:        true,
  normalize_text:    true,
  remove_outliers:   false,
  fix_formatting:    true,
}

// ── Transition presets (framer-motion) ────────────────────────

const fadeUp = {
  initial:   { opacity: 0, y: 28 },
  animate:   { opacity: 1, y: 0,  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  exit:      { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeIn' } },
}

// ── Helper sub-components ──────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('en-GB'))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <>{t}</>
}

// ── Main App ───────────────────────────────────────────────────

export default function App() {
  // ── State ──
  const [loaderDone, setLoaderDone] = useState(false)
  // step: 0 = hero, 1 = upload, 2 = configure, 3 = clean, 4 = export
  const [step, setStep]             = useState(0)
  const [fileData, setFileData]     = useState(null)
  const [config, setConfig]         = useState(DEFAULT_CONFIG)
  const [previewData, setPreviewData] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [cleanError, setCleanError] = useState(null)

  const { jobId, status, progress, log, stats, error, startJob, reset } =
    useCleaningJob()
  const lastLog = log[log.length - 1] || ''

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  // Fetch preview + auto-advance to export when cleaning done
  useEffect(() => {
    if (status === 'done' && jobId && !previewData) {
      getPreview(jobId).then(setPreviewData).catch(console.error)
      setTimeout(() => setStep(4), 1500)
    }
  }, [status, jobId]) // eslint-disable-line

  // ── Handlers ──
  const handleUploadSuccess = (data) => {
    setFileData(data)
    setTimeout(() => setStep(2), 900)   // auto-advance to configure
  }

  const handleConfigChange = (key, val) =>
    setConfig((p) => ({ ...p, [key]: val }))

  const handleStartCleaning = async () => {
    if (!fileData) return
    setIsStarting(true)
    setCleanError(null)
    try {
      const res = await startCleaning(fileData.file_id, config)
      startJob(res.job_id)
      setStep(3)
    } catch (err) {
      setCleanError(err?.response?.data?.detail || err.message || 'Failed to start')
    } finally {
      setIsStarting(false)
    }
  }

  const handleReset = () => {
    reset()
    setFileData(null)
    setConfig(DEFAULT_CONFIG)
    setPreviewData(null)
    setCleanError(null)
    setStep(0)
  }

  // nav active: 0=upload 1=configure 2=clean 3=export → step - 1
  const navActive = step - 1

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>

      {/* ── Loader overlay ── */}
      {!loaderDone && <Loader onComplete={() => setLoaderDone(true)} />}

      {/* ── Persistent fixed chrome ── */}
      <CustomCursor />
      <VerticalNav activeIndex={navActive} />

      {/* Corner stats */}
      <div className="corner-stat cs-tl">
        <span className="cs-label">LOCATION</span>
        <span className="cs-value">28.6441° N</span>
        <span className="cs-value">77.3910° E</span>
      </div>
      <div className="corner-stat cs-tr">
        <span className="cs-label">ROWS</span>
        <span className="cs-value">{fileData ? fileData.rows.toLocaleString() : '—'}</span>
        <span className="cs-label" style={{ marginTop: 4 }}>COLS</span>
        <span className="cs-value">{fileData ? fileData.cols : '—'}</span>
      </div>
      <div className="corner-stat cs-br">
        <span className="cs-label">LOCAL TIME</span>
        <span className="cs-value"><LiveClock /></span>
        {status && status !== 'idle' && (
          <>
            <span className="cs-label" style={{ marginTop: 4 }}>PIPELINE</span>
            <span className={`cs-value${status === 'done' ? ' accent' : ''}`}>
              {status === 'running' ? `${progress}%` : status.toUpperCase()}
            </span>
          </>
        )}
      </div>
      <div className="corner-stat cs-bl">
        <span className="cs-label">PURIXA</span>
        <span className="cs-value">v1.0.0</span>
      </div>

      {/* Top navbar */}
      <nav className="purixa-nav">
        <span className="nav-wordmark">Purixa</span>
        <div className="nav-links">
          <a href="https://github.com/ARCHIT-100069/Purixa" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://purixa-backend-production.up.railway.app/docs" target="_blank" rel="noreferrer">API Docs</a>
        </div>
      </nav>

      {/* ── Step content ── */}
      <AnimatePresence mode="wait">

        {/* ════ STEP 0 — HERO ════ */}
        {step === 0 && (
          <motion.div key="hero" {...fadeUp} className="step-view hero-view">
            {/* Green shapes */}
            <div className="green-shape tri-shape shape-tri"
              style={{ bottom: '22%', left: '-6px' }} />
            <div className="green-shape diamond-shape shape-dia"
              style={{ top: '30%', right: '42%' }} />

            {/* Canvas wireframe (right half) */}
            <DataWireframe />

            {/* Hero copy */}
            <div className="hero-copy">
              <div className="hero-headline-block">
                <span className="headline-solid">YOUR DATA.</span>
                <span className="headline-outline">CLEANED.</span>
              </div>
              <p className="hero-sub">
                Upload. Configure. Export. Done.
              </p>
              <button
                id="hero-start-btn"
                className="hero-cta"
                onClick={() => setStep(1)}
              >
                Start Cleaning <span aria-hidden>→</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ════ STEP 1 — UPLOAD ════ */}
        {step === 1 && (
          <motion.div key="upload" {...fadeUp} className="step-view step-section">
            <div className="section-bg-num">01</div>
            <div className="step-body">
              <span className="section-tag">FILE INGESTION</span>
              <div className="section-headline">
                <span className="headline-solid">DROP YOUR</span>
                <span className="headline-solid">DATASET.</span>
              </div>
              <p className="section-subtitle">
                CSV · JSON · TSV — up to 500MB. Large files use chunked streaming.
              </p>

              <div className="upload-layout">
                <div>
                  <div className="file-badges">
                    {['.csv', '.json', '.tsv'].map((ext) => (
                      <span key={ext} className="file-badge">{ext}</span>
                    ))}
                  </div>
                  <DropZone onUploadSuccess={handleUploadSuccess} />
                </div>

                {fileData ? (
                  <div>
                    <FileStats fileData={fileData} />
                    <button
                      id="go-configure-btn"
                      className="pill-cta"
                      style={{ marginTop: 24 }}
                      onClick={() => setStep(2)}
                    >
                      Configure Operations →
                    </button>
                  </div>
                ) : (
                  <p className="await-label">AWAITING FILE INPUT</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════ STEP 2 — CONFIGURE ════ */}
        {step === 2 && (
          <motion.div key="configure" {...fadeUp} className="step-view step-section">
            <div className="section-bg-num">02</div>
            <div className="step-body">
              <span className="section-tag">OPERATIONS</span>
              <div className="section-headline">
                <span className="headline-solid">SET YOUR</span>
                <span className="headline-outline">RULES.</span>
              </div>
              <p className="section-subtitle">
                Choose what gets cleaned. Toggle what you need.
              </p>

              <CleaningOptions config={config} onChange={handleConfigChange} />

              <div style={{ marginTop: 32 }}>
                {cleanError && <p className="error-text">{cleanError}</p>}
                <button
                  id="run-pipeline-btn"
                  className="pill-cta pill-cta-solid"
                  onClick={handleStartCleaning}
                  disabled={!fileData || isStarting}
                  style={{ marginTop: 16 }}
                >
                  {isStarting ? 'Starting...' : 'Run Purixa →'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════ STEP 3 — CLEAN ════ */}
        {step === 3 && (
          <motion.div key="clean" {...fadeUp} className="step-view step-section">
            <div className="section-bg-num">03</div>
            <div className="step-body">
              <span className="section-tag">PROCESSING</span>
              <div className="section-headline">
                <span className="headline-solid">
                  {status === 'done' ? 'PIPELINE' : 'RUNNING'}
                </span>
                <span className={status === 'done' ? 'headline-outline' : 'headline-solid'}>
                  {status === 'done' ? 'COMPLETE.' : 'PIPELINE.'}
                </span>
              </div>
              <p className="section-subtitle">
                {status === 'done'
                  ? `${(stats?.rows_after ?? 0).toLocaleString()} rows ready for export`
                  : 'Your dataset is being processed…'}
              </p>

              {/* Thin neon green progress bar */}
              <div className="progress-full">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>

              <div className="clean-layout">
                <ProgressBar progress={progress} statusText={lastLog} />
                <CleaningLog log={log} />
              </div>

              {status === 'error' && (
                <p className="error-text" style={{ marginTop: 16 }}>{error || 'Unknown error'}</p>
              )}
              {status === 'done' && (
                <button
                  id="view-results-btn"
                  className="pill-cta"
                  style={{ marginTop: 28 }}
                  onClick={() => setStep(4)}
                >
                  View Results →
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ════ STEP 4 — EXPORT ════ */}
        {step === 4 && (
          <motion.div key="export" {...fadeUp} className="step-view step-section">
            <div className="section-bg-num">04</div>
            <div className="step-body" style={{ paddingBottom: 100 }}>
              <span className="section-tag">EXPORT</span>
              <div className="section-headline">
                <span className="headline-solid">YOUR DATA</span>
                <span className="headline-outline">IS READY.</span>
              </div>
              <p className="section-subtitle">
                Download your cleaned dataset in your preferred format.
              </p>

              {previewData && (
                <StatsReport
                  stats={previewData.stats || stats}
                  summary={previewData.summary}
                />
              )}

              <ExportPanel jobId={jobId} stats={previewData?.stats || stats} />

              {previewData && (
                <>
                  <p className="preview-label">
                    DATA PREVIEW — FIRST {previewData.rows?.length} OF{' '}
                    {previewData.total_rows?.toLocaleString()} ROWS
                  </p>
                  <DataPreview
                    columns={previewData.columns}
                    rows={previewData.rows}
                    totalRows={previewData.total_rows}
                    columnTypes={previewData.column_types}
                  />
                </>
              )}

              <button
                id="clean-another-btn"
                className="restart-link"
                onClick={handleReset}
              >
                ↺ Clean another file
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Footer (always visible below active step) */}
      {step === 0 && (
        <footer className="purixa-footer">
          <div className="footer-left">PURIXA <span>v1.0.0</span></div>
          <div className="footer-center">Data cleaning, refined.</div>
          <div className="footer-right"><LiveClock /></div>
        </footer>
      )}
    </div>
  )
}
