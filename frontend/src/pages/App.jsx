import { useRef, useState, useEffect, useCallback } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// Visual components
import Loader        from '../components/Loader'
import CustomCursor  from '../components/CustomCursor'
import DataWireframe from '../components/DataWireframe'

// Functional components (API logic unchanged)
import DropZone        from '../components/DropZone'
import FileStats       from '../components/FileStats'
import CleaningOptions from '../components/CleaningOptions'
import ProgressBar     from '../components/ProgressBar'
import CleaningLog     from '../components/CleaningLog'
import DataPreview     from '../components/DataPreview'
import StatsReport     from '../components/StatsReport'

import { useCleaningJob } from '../hooks/useCleaningJob'
import { startCleaning, getPreview, downloadFile } from '../utils/api'

const DEFAULT_CONFIG = {
  remove_duplicates: true,
  handle_missing:    true,
  fix_dtypes:        true,
  normalize_text:    true,
  remove_outliers:   false,
  fix_formatting:    true,
}

// ── Inline sub-components ──────────────────────────────────────

function LockOverlay({ message }) {
  return (
    <div className="lock-overlay">
      <span className="lock-pill">{message}</span>
    </div>
  )
}

function StatCard({ label, value }) {
  const ref       = useRef(null)
  const [n, setN] = useState(0)
  const started   = useRef(false)

  useEffect(() => {
    if (!value || started.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        started.current = true
        const obj = { val: 0 }
        gsap.to(obj, {
          val: Number(value),
          duration: 1.6,
          ease: 'power2.out',
          onUpdate() { setN(Math.round(obj.val)) },
        })
        observer.disconnect()
      },
      { threshold: 0.6 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="stat-card">
      <span className="stat-card-val">{n.toLocaleString()}</span>
      <span className="stat-card-lbl">{label}</span>
    </div>
  )
}

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

const SECTION_IDS = ['section-hero', 'section-upload', 'section-configure', 'section-clean', 'section-export']
const NAV_LABELS  = ['UPLOAD', 'CONFIGURE', 'CLEAN', 'EXPORT']

// ── Main App ───────────────────────────────────────────────────

export default function App() {
  const mainRef = useRef(null)

  // ── State ──
  const [loaderDone, setLoaderDone]     = useState(false)
  const [activeIdx, setActiveIdx]       = useState(0)   // index into SECTION_IDS
  const [fileData, setFileData]         = useState(null)
  const [config, setConfig]             = useState(DEFAULT_CONFIG)
  const [previewData, setPreviewData]   = useState(null)
  const [isStarting, setIsStarting]     = useState(false)
  const [cleanError, setCleanError]     = useState(null)

  const { jobId, status, progress, log, stats, error, startJob, reset } = useCleaningJob()
  const lastLog = log[log.length - 1] || ''

  // ── Scroll helper ──
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // ── IntersectionObserver — active section ──
  useEffect(() => {
    if (!loaderDone) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActiveIdx(SECTION_IDS.indexOf(e.target.id))
          }
        })
      },
      { threshold: 0.45 }
    )
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [loaderDone])

  // ── GSAP scroll-triggered entrance animations ──
  useGSAP(
    () => {
      if (!loaderDone) return
      ScrollTrigger.refresh()

      // Hero: animate in right after loader exits (no scroll trigger)
      gsap.timeline({ delay: 0.15 })
        .from('.hero-word', { yPercent: 112, stagger: 0.1, duration: 0.85, ease: 'power3.out' })
        .from('.hero-sub',  { opacity: 0, y: 20, duration: 0.6 }, '-=0.35')
        .from('.hero-cta',  { opacity: 0, scale: 0.9, duration: 0.5 }, '-=0.3')
        .from('.shape-tri', { x: -90, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.55')
        .from('.shape-dia', { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.45')
        .from('.hero-meta-item', { opacity: 0, stagger: 0.08, duration: 0.4 }, '-=0.4')
        .from('.scroll-hint', { opacity: 0, duration: 0.5 }, '-=0.2')

      // Each content section: headline + tag + subtitle slide up
      ;['upload', 'configure', 'clean', 'export'].forEach((name) => {
        const t = `#section-${name}`
        const opts = { start: 'top 72%', toggleActions: 'play none none none' }

        gsap.from(`${t} .section-bg-num`, {
          opacity: 0, x: -40, duration: 0.9,
          scrollTrigger: { trigger: t, ...opts },
        })
        gsap.from(`${t} .section-tag`, {
          opacity: 0, y: 20, duration: 0.6,
          scrollTrigger: { trigger: t, ...opts },
        })
        gsap.from(`${t} .section-headline`, {
          y: 65, opacity: 0, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: t, ...opts },
        })
        gsap.from(`${t} .section-subtitle`, {
          y: 30, opacity: 0, duration: 0.65, delay: 0.15,
          scrollTrigger: { trigger: t, ...opts },
        })
      })

      // Upload: zone fades up
      gsap.from('#section-upload .upload-layout', {
        y: 40, opacity: 0, duration: 0.8, delay: 0.2,
        scrollTrigger: { trigger: '#section-upload', start: 'top 70%', toggleActions: 'play none none none' },
      })

      // Configure: cards container (framer-motion handles card-level, we animate wrapper)
      gsap.from('#section-configure .options-wrapper', {
        y: 44, opacity: 0, duration: 0.9, delay: 0.25,
        scrollTrigger: { trigger: '#section-configure', start: 'top 68%', toggleActions: 'play none none none' },
      })

      // Clean: content area
      gsap.from('#section-clean .clean-inner', {
        y: 40, opacity: 0, duration: 0.8, delay: 0.2,
        scrollTrigger: { trigger: '#section-clean', start: 'top 70%', toggleActions: 'play none none none' },
      })

      // Export: content area
      gsap.from('#section-export .export-inner', {
        y: 40, opacity: 0, duration: 0.8, delay: 0.2,
        scrollTrigger: { trigger: '#section-export', start: 'top 70%', toggleActions: 'play none none none' },
      })
    },
    { scope: mainRef, dependencies: [loaderDone] }
  )

  // Refresh ScrollTrigger when layout changes
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 120)
    return () => clearTimeout(t)
  }, [fileData, previewData])

  // Auto-scroll: upload done → configure (after 1.2s)
  const handleUploadSuccess = (data) => {
    setFileData(data)
    setTimeout(() => scrollTo('section-configure'), 1200)
  }

  const handleConfigChange = (key, val) =>
    setConfig((p) => ({ ...p, [key]: val }))

  // Start cleaning → scroll to clean section
  const handleStartCleaning = async () => {
    if (!fileData) return
    setIsStarting(true)
    setCleanError(null)
    try {
      const res = await startCleaning(fileData.file_id, config)
      startJob(res.job_id)
      scrollTo('section-clean')
    } catch (err) {
      setCleanError(err?.response?.data?.detail || err.message || 'Failed to start')
    } finally {
      setIsStarting(false)
    }
  }

  // Auto-scroll: clean done → export (after 1.5s)
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

  const handleDownload = (fmt) => {
    if (!jobId) return
    downloadFile(jobId, fmt)
  }

  // Active nav index: SECTION_IDS index 1-4 maps to NAV_LABELS index 0-3
  const navActive = activeIdx - 1  // -1 for hero (none active)

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div ref={mainRef}>
      {/* ── LOADER ── */}
      {!loaderDone && <Loader onComplete={() => setLoaderDone(true)} />}

      {/* ── CURSOR ── */}
      <CustomCursor />

      {/* ── FIXED: Top navbar ── */}
      <nav className="purixa-nav">
        <span className="nav-wordmark">Purixa</span>
        <div className="nav-links">
          <a href="https://github.com/ARCHIT-100069/Purixa" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://purixa-backend-production.up.railway.app/docs" target="_blank" rel="noreferrer">API Docs</a>
        </div>
      </nav>

      {/* ── FIXED: Left vertical nav ── */}
      <nav className="vertical-nav" aria-label="Steps">
        {NAV_LABELS.map((label, i) => (
          <span key={label} style={{ display: 'contents' }}>
            {i > 0 && <span className="vn-sep" />}
            <span
              className={`vn-item${navActive === i ? ' active' : ''}`}
              onClick={() => scrollTo(SECTION_IDS[i + 1])}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              {label}
            </span>
          </span>
        ))}
      </nav>

      {/* ── FIXED: Corner stats ── */}
      {/* Top-left: coordinates */}
      <div className="corner-stat cs-tl hero-meta-item">
        <span className="cs-label">LOCATION</span>
        <span className="cs-value">28.6441° N</span>
        <span className="cs-value">77.3910° E</span>
      </div>
      {/* Top-right: file stats */}
      <div className="corner-stat cs-tr hero-meta-item">
        <span className="cs-label">ROWS</span>
        <span className="cs-value">{fileData ? fileData.rows.toLocaleString() : '—'}</span>
        <span className="cs-label" style={{ marginTop: 5 }}>COLS</span>
        <span className="cs-value">{fileData ? fileData.cols : '—'}</span>
      </div>
      {/* Bottom-right: time */}
      <div className="corner-stat cs-br hero-meta-item">
        <span className="cs-label">LOCAL TIME</span>
        <span className="cs-value"><LiveClock /></span>
        {status && status !== 'idle' && (
          <>
            <span className="cs-label" style={{ marginTop: 5 }}>PIPELINE</span>
            <span className={`cs-value${status === 'done' ? ' accent' : ''}`}>
              {status === 'running' ? `${progress}%` : status.toUpperCase()}
            </span>
          </>
        )}
      </div>
      {/* Bottom-left: version */}
      <div className="corner-stat cs-bl hero-meta-item">
        <span className="cs-label">PURIXA</span>
        <span className="cs-value">v1.0.0</span>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════════════ */}
      <section id="section-hero" className="scroll-section hero-section" style={{ minHeight: '100vh' }}>
        {/* Green shapes */}
        <div className="green-shape tri-shape shape-tri" style={{ bottom: '22%', left: '-8px' }} />
        <div className="green-shape diamond-shape shape-dia" style={{ top: '28%', right: '40%' }} />

        {/* Hero content */}
        <div className="section-body hero-content" style={{ maxWidth: 680 }}>
          <div className="hero-headline">
            <div className="hero-word-wrap">
              <span className="hero-word headline-solid">YOUR DATA.</span>
            </div>
            <div className="hero-word-wrap">
              <span className="hero-word headline-outline">CLEANED.</span>
            </div>
          </div>

          <p className="hero-sub">Upload. Configure. Export. Done.</p>

          <a
            href="#section-upload"
            id="hero-cta"
            className="hero-cta"
            onClick={(e) => { e.preventDefault(); scrollTo('section-upload') }}
          >
            Start Cleaning <span aria-hidden>→</span>
          </a>

          <div className="scroll-hint">
            <span>SCROLL DOWN</span>
            <div className="scroll-hint-line" />
          </div>
        </div>

        {/* Animated canvas wireframe */}
        <DataWireframe />

        <div className="section-rule" />
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 2 — UPLOAD
      ════════════════════════════════════════════════ */}
      <section id="section-upload" className="scroll-section">
        <div className="section-bg-num">01</div>

        <div className="section-body">
          <span className="section-tag">FILE INGESTION</span>

          <div className="section-headline">
            <span className="headline-solid">DROP YOUR</span>
            <span className="headline-solid">DATASET.</span>
          </div>

          <p className="section-subtitle">
            CSV · JSON · TSV — up to 500MB. Large files use chunked streaming.
          </p>

          <div className="file-badges">
            {['.csv', '.json', '.tsv'].map((ext) => (
              <span key={ext} className="file-badge">{ext}</span>
            ))}
          </div>

          <div className="upload-layout">
            {/* Drop zone */}
            <div id="upload-drop-zone">
              <DropZone onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* Right panel */}
            {fileData ? (
              <div>
                <FileStats fileData={fileData} />
                <button
                  id="scroll-to-configure-btn"
                  className="pill-cta"
                  style={{ marginTop: 24 }}
                  onClick={() => scrollTo('section-configure')}
                >
                  Set operations →
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
          SECTION 3 — CONFIGURE
      ════════════════════════════════════════════════ */}
      <section id="section-configure" className="scroll-section">
        {!fileData && <LockOverlay message="↑ Upload a file first" />}
        <div className="section-bg-num">02</div>

        <div className="section-body">
          <span className="section-tag">OPERATIONS</span>

          <div className="section-headline">
            <span className="headline-solid">SET YOUR</span>
            <span className="headline-outline">RULES.</span>
          </div>

          <p className="section-subtitle">
            Choose what gets cleaned. Toggle what you need.
          </p>

          <div className="options-wrapper">
            <CleaningOptions config={config} onChange={handleConfigChange} />
          </div>

          <div style={{ marginTop: 32 }}>
            {cleanError && <p className="error-text">{cleanError}</p>}
            <button
              id="run-pipeline-btn"
              className="pill-cta pill-cta-solid"
              onClick={handleStartCleaning}
              disabled={!fileData || isStarting}
              style={{ marginTop: 16, border: 'none' }}
            >
              {isStarting ? 'Starting...' : 'Run Purixa →'}
            </button>
          </div>
        </div>

        <div className="section-rule" />
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 4 — CLEAN
      ════════════════════════════════════════════════ */}
      <section id="section-clean" className="scroll-section">
        {!jobId && <LockOverlay message="↑ Configure and run the pipeline first" />}
        <div className="section-bg-num">03</div>

        <div className="section-body">
          <span className="section-tag">PROCESSING</span>

          <div className="section-headline">
            <span className="headline-solid">
              {status === 'done'
                ? 'PIPELINE'
                : status === 'error'
                ? 'PIPELINE'
                : 'RUNNING'}
            </span>
            <span className={status === 'done' ? 'headline-outline' : 'headline-solid'}>
              {status === 'done'
                ? 'COMPLETE.'
                : status === 'error'
                ? 'FAILED.'
                : 'PIPELINE.'}
            </span>
          </div>

          <p className="section-subtitle">
            {status === 'done'
              ? `${(stats?.rows_after ?? 0).toLocaleString()} rows in output`
              : 'Your dataset is being processed...'}
          </p>

          <div className="clean-inner">
            {/* Custom thin progress bar */}
            <div className="progress-full">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="clean-layout">
              <ProgressBar progress={progress} statusText={lastLog} />
              <CleaningLog log={log} />
            </div>

            {/* Before/after stat cards */}
            {status === 'done' && stats && (
              <div className="clean-stat-grid">
                <StatCard label="ROWS BEFORE"         value={stats.rows_before} />
                <StatCard label="ROWS AFTER"          value={stats.rows_after} />
                <StatCard label="DUPLICATES REMOVED"  value={stats.duplicates_removed} />
                <StatCard label="MISSING FILLED"      value={stats.missing_filled} />
                <StatCard label="OUTLIERS REMOVED"    value={stats.outliers_removed} />
              </div>
            )}

            {status === 'error' && (
              <p className="error-text" style={{ marginTop: 16 }}>{error || 'Unknown error'}</p>
            )}

            {status === 'done' && (
              <button
                id="view-results-btn"
                className="pill-cta"
                style={{ marginTop: 28 }}
                onClick={() => scrollTo('section-export')}
              >
                View Results →
              </button>
            )}
          </div>
        </div>

        <div className="section-rule" />
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 5 — EXPORT
      ════════════════════════════════════════════════ */}
      <section id="section-export" className="scroll-section" style={{ minHeight: '100vh' }}>
        {status !== 'done' && <LockOverlay message="↑ Complete the cleaning pipeline first" />}
        <div className="section-bg-num">04</div>

        <div className="section-body" style={{ paddingBottom: 100 }}>
          <span className="section-tag">EXPORT</span>

          <div className="section-headline">
            <span className="headline-solid">YOUR DATA</span>
            <span className="headline-outline">IS READY.</span>
          </div>

          <p className="section-subtitle">
            Download your cleaned dataset in your preferred format.
          </p>

          <div className="export-inner">
            {/* Before/after summary */}
            {previewData && (
              <StatsReport stats={previewData.stats || stats} summary={previewData.summary} />
            )}

            {/* Large download buttons */}
            <div className="download-row">
              <button
                id="download-csv-btn"
                className="dl-btn-primary"
                onClick={() => handleDownload('csv')}
                disabled={!jobId}
              >
                ↓ DOWNLOAD CSV
              </button>
              <button
                id="download-json-btn"
                className="dl-btn-outline"
                onClick={() => handleDownload('json')}
                disabled={!jobId}
              >
                ↓ DOWNLOAD JSON
              </button>
            </div>

            {/* Data preview table */}
            {previewData && (
              <>
                <span className="preview-label">
                  DATA PREVIEW — FIRST {previewData.rows?.length} ROWS OF {previewData.total_rows?.toLocaleString()}
                </span>
                <DataPreview
                  columns={previewData.columns}
                  rows={previewData.rows}
                  totalRows={previewData.total_rows}
                  columnTypes={previewData.column_types}
                />
              </>
            )}

            <button id="clean-another-btn" className="restart-link" onClick={handleReset}>
              ↺ Clean another file
            </button>
          </div>
        </div>

        <div className="section-rule" />
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 6 — FOOTER
      ════════════════════════════════════════════════ */}
      <footer className="purixa-footer">
        <div className="footer-left">
          PURIXA
          <span>v1.0.0</span>
        </div>
        <div className="footer-center">Data cleaning, refined.</div>
        <div className="footer-right">
          <LiveClock />
        </div>
      </footer>
    </div>
  )
}
