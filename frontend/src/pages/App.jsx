import { useState, useEffect, useRef, useCallback } from 'react'

// Visual components (no GSAP)
import Loader        from '../components/Loader'
import SplashCursor   from '../components/SplashCursor'
import DataWireframe from '../components/DataWireframe'

// Functional components (logic unchanged)
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

/* ─── Constants ────────────────────────────────── */
const DEFAULT_CONFIG = {
  remove_duplicates: true,
  handle_missing:    true,
  fix_dtypes:        true,
  normalize_text:    true,
  remove_outliers:   false,
  fix_formatting:    true,
}

const MARQUEE_TEXT = 'REMOVE DUPLICATES · FIX MISSING VALUES · NORMALIZE TEXT · REMOVE OUTLIERS · FIX FORMATTING · CLEAN DATA · '
const FEATURE_CARDS = [
  { num: '01', title: 'HANDLES 500MB', lines: ['Files up to 500MB processed', 'without freezing your browser.'] },
  { num: '02', title: '6 CLEANING OPS', lines: ['Remove dupes · fix types ·', 'normalize · remove outliers.'] },
  { num: '03', title: 'ZERO AI', lines: ['Pure pandas logic.', 'Deterministic. Fast. Free.'] },
]
const COUNTERS = [
  { end: 500, suffix: 'MB', label: 'MAX FILE SIZE' },
  { end: 6,   suffix: '',   label: 'CLEANING OPERATIONS' },
  { end: 10,  suffix: 'K',  label: 'ROWS PER CHUNK' },
]

const SECTION_IDS = ['section-hero', 'section-upload', 'section-configure', 'section-clean', 'section-export']

/* ─── Inline helpers ────────────────────────────── */
function LiveClock() {
  const formatTime = () => {
    const now = new Date()
    let hours = now.getHours()
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${ampm}`
  }
  const [t, setT] = useState(formatTime)
  useEffect(() => {
    // Update every minute (no seconds displayed)
    const id = setInterval(() => setT(formatTime()), 60000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line
  return <>{t}</>
}

function LockOverlay({ message }) {
  return (
    <div className="lock-overlay">
      <span className="lock-pill">{message}</span>
    </div>
  )
}

/* Counter with rAF ease-out cubic */
function AnimatedCounter({ end, suffix = '', label }) {
  const ref     = useRef(null)
  const started = useRef(false)
  const [val, setVal] = useState('0')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return
      started.current = true
      const duration = 1500
      const start = performance.now()
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        const cur = Math.floor(eased * end)
        setVal(cur + suffix)
        if (p < 1) requestAnimationFrame(tick)
        else setVal(end + suffix)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end, suffix])

  return (
    <div ref={ref} className="counter-item">
      <span className="counter-num">{val}</span>
      <span className="counter-label">{label}</span>
    </div>
  )
}

/* StatCard with count-up on intersection */
function StatCard({ label, value }) {
  const ref     = useRef(null)
  const started = useRef(false)
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!value) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return
      started.current = true
      const duration = 1600
      const start = performance.now()
      const target = Number(value)
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setN(Math.floor(eased * target))
        if (p < 1) requestAnimationFrame(tick)
        else setN(target)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="stat-card">
      <span className="stat-card-val">{n.toLocaleString()}</span>
      <span className="stat-card-lbl">{label}</span>
    </div>
  )
}

/* ─── Main App ──────────────────────────────────── */
export default function App() {
  /* State */
  const [loaderDone, setLoaderDone]     = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const [fileData, setFileData]         = useState(null)
  const [config, setConfig]             = useState(DEFAULT_CONFIG)
  const [previewData, setPreviewData]   = useState(null)
  const [isStarting, setIsStarting]     = useState(false)
  const [cleanError, setCleanError]     = useState(null)

  const { jobId, status, progress, log, stats, error, startJob, reset } = useCleaningJob()
  const lastLog = log[log.length - 1] || ''

  /* ── Force top of page on every mount ── */
  useEffect(() => {
    // Disable browser scroll-restoration so it never jumps to a saved position
    if (typeof history !== 'undefined') history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  /* ── Reveal IntersectionObserver ── */
  const setupReveal = useCallback(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.15 })
    document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => obs.observe(el))
    return obs
  }, [])

  useEffect(() => {
    if (!loaderDone) return
    const obs = setupReveal()
    return () => obs.disconnect()
  }, [loaderDone, setupReveal])

  /* Re-observe when new content appears */
  useEffect(() => {
    if (!loaderDone) return
    const obs = setupReveal()
    return () => obs.disconnect()
  }, [fileData, previewData, status, loaderDone, setupReveal])

  /* ── Active section IntersectionObserver ── */
  /* Re-runs whenever a new section mounts (fileData / jobId / status change) */
  useEffect(() => {
    if (!loaderDone) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = SECTION_IDS.indexOf(e.target.id)
          if (idx !== -1) setActiveSection(idx)
        }
      })
    }, { threshold: 0.4 })
    SECTION_IDS.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [loaderDone, fileData, jobId, status])

  /* ── Scroll helper ── */
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  /* ── Handlers ── */
  const handleUploadSuccess = (data) => {
    setFileData(data)
    setTimeout(() => scrollTo('section-configure'), 900)
  }
  const handleConfigChange = (key, val) => setConfig(p => ({ ...p, [key]: val }))

  const handleStartCleaning = async () => {
    if (!fileData) return
    setIsStarting(true)
    setCleanError(null)
    try {
      const res = await startCleaning(fileData.file_id, config)
      startJob(res.job_id)
      // Delay scroll so React renders section-clean into DOM first
      setTimeout(() => scrollTo('section-clean'), 120)
    } catch (err) {
      setCleanError(err?.response?.data?.detail || err.message || 'Failed to start')
    } finally {
      setIsStarting(false)
    }
  }

  useEffect(() => {
    if (status === 'done' && jobId && !previewData) {
      getPreview(jobId).then(setPreviewData).catch(console.error)
      setTimeout(() => scrollTo('section-export'), 1500)
    }
  }, [status, jobId]) // eslint-disable-line

  const handleReset = () => {
    reset()
    setFileData(null)
    setConfig(DEFAULT_CONFIG)
    setPreviewData(null)
    setCleanError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ════ RENDER ════ */
  return (
    <div className={loaderDone ? 'app-ready' : 'app-loading'}>

      {/* ── Loader ── */}
      {!loaderDone && <Loader onComplete={() => setLoaderDone(true)} />}

      {/* ── SplashCursor ── */}
      <SplashCursor
        RAINBOW_MODE={false}
        COLOR="#4DE069"
        TRANSPARENT={true}
        DENSITY_DISSIPATION={3.5}
        VELOCITY_DISSIPATION={2}
        SPLAT_RADIUS={0.2}
        CURL={3}
      />



      {/* ── Bottom-right: Local Time + Pipeline status ── */}
      <div className="corner-stat cs-br">
        <span className="cs-label">LOCAL TIME</span>
        <span className="cs-value"><LiveClock /></span>
        <span className="cs-label" style={{ marginTop: 6 }}>PIPELINE</span>
        <span className={`cs-value${status === 'done' ? ' accent' : ''}`}>
          {!status || status === 'idle'
            ? '—'
            : status === 'running'
            ? `${progress}%`
            : status.toUpperCase()}
        </span>
      </div>

      {/* ── Navbar ── */}
      <nav className="purixa-nav">
        <span className="nav-wordmark">Purixa</span>
      </nav>

      {/* ════════════════════════════════════════════════
          PHASE 1 — HERO
      ════════════════════════════════════════════════ */}
      <section id="section-hero" className="hero-section">
        {/* Green shapes */}
        <div className="green-shape tri-shape" style={{ bottom: '22%', left: '-6px' }} />
        <div className="green-shape diamond-shape" style={{ top: '30%', right: '42%' }} />

        {/* Animated wireframe graph */}
        <DataWireframe />

        {/* Hero copy — CSS animations trigger via .app-ready class */}
        <div className="hero-content">
          <div className="hero-headline-block">
            <span className="hero-line-1 headline-solid">PURIFY.</span>
            <span className="hero-line-2 headline-solid">PROCESS.</span>
            <span className="hero-line-3 headline-outline">PERFORM.</span>
          </div>
          <p className="hero-subtitle hero-sub">
            Upload. Configure. Export. Done.
          </p>
        </div>

        {/* Scroll indicator — pulsing at bottom center */}
        <div className="scroll-indicator">
          SCROLL DOWN
          <span>↓</span>
        </div>

        <div className="section-rule" />
      </section>

      {/* ════════════════════════════════════════════════
          PHASE 2A — MARQUEE STRIP
      ════════════════════════════════════════════════ */}
      <div className="marquee-section">
        {/* Row 1: left */}
        <div className="marquee-row">
          <div className="marquee-track-left" aria-hidden>
            {[0, 1].map(i => (
              <span key={i} className="marquee-text">
                {MARQUEE_TEXT.split(' · ').map((word, j) => (
                  <span key={j}>
                    {word}{' '}
                    {j < MARQUEE_TEXT.split(' · ').length - 1 && (
                      <span className="dot">·</span>
                    )}
                    {' '}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        {/* Row 2: right */}
        <div className="marquee-row">
          <div className="marquee-track-right" aria-hidden>
            {[0, 1].map(i => (
              <span key={i} className="marquee-text">
                {MARQUEE_TEXT.split(' · ').map((word, j) => (
                  <span key={j}>
                    {word}{' '}
                    {j < MARQUEE_TEXT.split(' · ').length - 1 && (
                      <span className="dot">·</span>
                    )}
                    {' '}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          PHASE 2B — FEATURE CARDS
      ════════════════════════════════════════════════ */}
      <div className="feature-section">
        <span className="feature-section-tag reveal">CAPABILITIES</span>
        <h2 className="headline-solid reveal" style={{ marginTop: 16, fontSize: 'clamp(28px,3vw,40px)' }}>
          WHAT PURIXA DOES.
        </h2>

        <div className="feature-grid">
          {FEATURE_CARDS.map((card) => (
            <div key={card.num} className="feature-card reveal">
              <div className="feature-card-num">{card.num}</div>
              <div className="feature-card-dot" />
              <div className="feature-card-title">{card.title}</div>
              <div className="feature-card-body">
                {card.lines.map((l, i) => <span key={i}>{l}<br /></span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          PHASE 2C — ANIMATED STAT COUNTERS
      ════════════════════════════════════════════════ */}
      <div className="counter-section">
        <span className="counter-section-tag">BY THE NUMBERS</span>
        <p className="counter-headline">PURIXA IN NUMBERS.</p>
        <div className="counter-grid">
          {COUNTERS.map(c => (
            <AnimatedCounter key={c.label} end={c.end} suffix={c.suffix} label={c.label} />
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          PHASE 3 — UPLOAD
      ════════════════════════════════════════════════ */}
      <section id="section-upload" className="full-section">
        <div className="section-bg-num">01</div>
        <div className="section-body">
          <span className="section-tag reveal-left">FILE INGESTION</span>
          <div style={{ marginBottom: 14 }}>
            <span className="headline-solid reveal">DROP YOUR</span>
            <span className="headline-solid reveal">DATASET.</span>
          </div>
          <p className="section-subtitle reveal">
            CSV · JSON · TSV — up to 500MB. Large files use chunked streaming.
          </p>
          <div className="file-badges reveal">
            {['.csv', '.json', '.tsv'].map(ext => (
              <span key={ext} className="file-badge">{ext}</span>
            ))}
          </div>
          <div className="upload-layout reveal">
            <div id="upload-drop-zone">
              <DropZone onUploadSuccess={handleUploadSuccess} />
            </div>
            {fileData ? (
              <div>
                <FileStats fileData={fileData} />
                <button
                  id="go-configure-btn"
                  className="pill-cta"
                  style={{ marginTop: 24 }}
                  onClick={() => scrollTo('section-configure')}
                >
                  Configure Operations →
                </button>
              </div>
            ) : (
              <p className="await-label">AWAITING FILE INPUT</p>
            )}
          </div>
        </div>
        <div className="section-rule" />
      </section>

      {/* ════════════════════════════════════════════════
          PHASE 4 — CONFIGURE (unlocks after file upload)
      ════════════════════════════════════════════════ */}
      {fileData && (
      <section id="section-configure" className="full-section section-enter">
        <div className="section-bg-num">02</div>
        <div className="section-body">
          <span className="section-tag reveal-left">OPERATIONS</span>
          <div style={{ marginBottom: 14 }}>
            <span className="headline-solid reveal">SET YOUR</span>
            <span className="headline-outline reveal">RULES.</span>
          </div>
          <p className="section-subtitle reveal">
            Choose what gets cleaned. Toggle what you need.
          </p>
          {/* Wrap CleaningOptions in reveal — framer-motion handles internal card appearance */}
          <div className="reveal">
            <CleaningOptions config={config} onChange={handleConfigChange} />
          </div>
          <div className="reveal" style={{ marginTop: 32 }}>
            {cleanError && <p className="error-text">{cleanError}</p>}
            <button
              id="run-pipeline-btn"
              className="pill-cta pill-cta-solid"
              onClick={handleStartCleaning}
              disabled={!fileData || isStarting}
              style={{ marginTop: 16 }}
            >
              {isStarting ? 'Starting...' : 'RUN PURIXA →'}
            </button>
          </div>
        </div>
        <div className="section-rule" />
      </section>
      )}

      {/* ════════════════════════════════════════════════
          PHASE 5 — CLEAN (unlocks after pipeline starts)
      ════════════════════════════════════════════════ */}
      {jobId && (
      <section id="section-clean" className="full-section section-enter">
        <div className="section-bg-num">03</div>
        <div className="section-body">
          <span className="section-tag reveal-left">PROCESSING</span>
          <div style={{ marginBottom: 14 }}>
            <span className="headline-solid reveal">
              {status === 'done' ? 'PIPELINE' : 'RUNNING'}
            </span>
            <span className={`reveal ${status === 'done' ? 'headline-outline' : 'headline-solid'}`}>
              {status === 'done' ? 'COMPLETE.' : 'PIPELINE.'}
            </span>
          </div>
          <p className="section-subtitle reveal">
            {status === 'done'
              ? `${(stats?.rows_after ?? 0).toLocaleString()} rows ready for export`
              : 'Your dataset is being processed…'}
          </p>

          {/* Thin green progress bar */}
          <div className="progress-full reveal">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="clean-layout reveal">
            <ProgressBar progress={progress} statusText={lastLog} />
            <CleaningLog log={log} />
          </div>

          {/* Stat cards count up on completion */}
          {status === 'done' && stats && (
            <div className="clean-stat-grid">
              <StatCard label="ROWS BEFORE"        value={stats.rows_before} />
              <StatCard label="ROWS AFTER"         value={stats.rows_after} />
              <StatCard label="DUPLICATES REMOVED" value={stats.duplicates_removed} />
              <StatCard label="MISSING FILLED"     value={stats.missing_filled} />
              <StatCard label="OUTLIERS REMOVED"   value={stats.outliers_removed} />
            </div>
          )}

          {status === 'error' && (
            <p className="error-text" style={{ marginTop: 16 }}>{error || 'Unknown error'}</p>
          )}
          {status === 'done' && (
            <button
              id="view-results-btn"
              className="pill-cta reveal"
              style={{ marginTop: 28 }}
              onClick={() => scrollTo('section-export')}
            >
              View Results →
            </button>
          )}
        </div>
        <div className="section-rule" />
      </section>
      )}

      {/* ════════════════════════════════════════════════
          PHASE 6 — EXPORT (unlocks when pipeline complete)
      ════════════════════════════════════════════════ */}
      {status === 'done' && (
      <section id="section-export" className="full-section section-enter" style={{ minHeight: '100vh', alignItems: 'flex-start' }}>
        <div className="section-bg-num">04</div>
        <div className="section-body" style={{ paddingBottom: 100 }}>
          <span className="section-tag reveal-left">EXPORT</span>
          <div style={{ marginBottom: 14 }}>
            <span className="headline-solid reveal">YOUR DATA</span>
            <span className="headline-outline reveal">IS READY.</span>
          </div>
          <p className="section-subtitle reveal">
            Download your cleaned dataset in your preferred format.
          </p>

          {previewData && (
            <div className="reveal">
              <StatsReport stats={previewData.stats || stats} summary={previewData.summary} />
            </div>
          )}

          {/* Large download buttons */}
          <div className="download-row reveal">
            <ExportPanel jobId={jobId} stats={previewData?.stats || stats} />
          </div>

          {/* Data preview table */}
          {previewData && (
            <div className="reveal">
              <span className="preview-label">
                DATA PREVIEW — FIRST {previewData.rows?.length} OF {previewData.total_rows?.toLocaleString()} ROWS
              </span>
              <DataPreview
                columns={previewData.columns}
                rows={previewData.rows}
                totalRows={previewData.total_rows}
                columnTypes={previewData.column_types}
              />
            </div>
          )}

          <button id="clean-another-btn" className="restart-link reveal" onClick={handleReset}>
            ↺ CLEAN ANOTHER FILE →
          </button>
        </div>
      </section>
      )}


    </div>
  )
}
