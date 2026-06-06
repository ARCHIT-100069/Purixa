import { useRef, useState, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, useGSAP)

// New visual components
import Loader        from '../components/Loader'
import CustomCursor  from '../components/CustomCursor'
import VerticalNav   from '../components/VerticalNav'
import FloatingStats from '../components/FloatingStats'
import DataWireframe from '../components/DataWireframe'

// Functional components (unchanged logic, restyled via CSS tokens)
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

const DEFAULT_CONFIG = {
  remove_duplicates: true,
  handle_missing:    true,
  fix_dtypes:        true,
  normalize_text:    true,
  remove_outliers:   false,
  fix_formatting:    true,
}

export default function App() {
  const mainRef        = useRef(null)
  const [loaderDone, setLoaderDone] = useState(false)
  const [activeSection, setActiveSection] = useState(-1)  // -1 = hero
  const [fileData, setFileData]     = useState(null)
  const [config, setConfig]         = useState(DEFAULT_CONFIG)
  const [previewData, setPreviewData] = useState(null)
  const [isStartingClean, setIsStartingClean] = useState(false)
  const [cleanError, setCleanError] = useState(null)

  const { jobId, status, progress, log, stats, error, startJob, reset } = useCleaningJob()
  const lastLog = log[log.length - 1] || ''

  // ── GSAP SCROLL ANIMATIONS ──────────────────────────
  useGSAP(
    () => {
      if (!loaderDone) return

      // Give DOM a frame to settle after loader exit
      ScrollTrigger.refresh()

      const mm = gsap.matchMedia()

      // ── DESKTOP (pinned sections) ──
      mm.add('(min-width: 768px)', () => {
        // Hero — word reveal scrubbed to scroll
        const heroTL = gsap.timeline({
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: '+=900',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onEnter:     () => setActiveSection(-1),
            onEnterBack: () => setActiveSection(-1),
          },
        })
        heroTL
          .from('.hero-word', {
            yPercent: 115,
            duration: 1,
            stagger: 0.18,
            ease: 'power3.out',
          })
          .from('.hero-subtitle',  { opacity: 0, y: 24, duration: 0.7 }, '-=0.4')
          .from('.hero-cta',       { opacity: 0, scale: 0.92, duration: 0.5 }, '-=0.3')
          .from('.hero-scroll-hint', { opacity: 0, duration: 0.4 }, '-=0.2')
          .from('.hero-meta',      { opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.6')
          // Green shapes parallax during hero scroll
          .to('.shape-1', { x: 180, y: -60, rotation: 20, duration: 2 }, 0)
          .to('.shape-2', { x: -120, y: 60,  rotation: -30, duration: 2 }, 0)
          .to('.shape-3', { x: -200, opacity: 0.3, duration: 2 }, 0)

        // Section 01 — Upload
        gsap.timeline({
          scrollTrigger: {
            trigger: '#section-upload',
            start: 'top top',
            end: '+=700',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onEnter:     () => setActiveSection(0),
            onEnterBack: () => setActiveSection(0),
          },
        })
          .from('.upload-number',  { x: -120, opacity: 0, duration: 1 })
          .from('.upload-heading', { y: 70,  opacity: 0, duration: 0.9 }, '-=0.5')
          .from('.upload-zone',    { opacity: 0, scale: 0.93, duration: 0.8 }, '-=0.4')
          .from('.upload-meta',    { opacity: 0, x: 30, duration: 0.6, stagger: 0.1 }, '-=0.3')

        // Section 02 — Configure
        gsap.timeline({
          scrollTrigger: {
            trigger: '#section-configure',
            start: 'top top',
            end: '+=800',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onEnter:     () => setActiveSection(1),
            onEnterBack: () => setActiveSection(1),
          },
        })
          .from('.configure-number',  { x: -120, opacity: 0, duration: 1 })
          .from('.configure-heading', { y: 70,  opacity: 0, duration: 0.9 }, '-=0.5')
          .from('.card-hover',        { y: 50,  opacity: 0, stagger: 0.1, duration: 0.7 }, '-=0.3')
          .from('.configure-actions', { opacity: 0, y: 20, duration: 0.6 }, '-=0.2')

        // Section 03 — Clean
        gsap.timeline({
          scrollTrigger: {
            trigger: '#section-clean',
            start: 'top top',
            end: '+=600',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onEnter:     () => setActiveSection(2),
            onEnterBack: () => setActiveSection(2),
          },
        })
          .from('.clean-number',  { x: -120, opacity: 0, duration: 1 })
          .from('.clean-heading', { y: 70,  opacity: 0, duration: 0.9 }, '-=0.5')
          .from('.clean-content', { opacity: 0, y: 40,  duration: 0.8 }, '-=0.4')

        // Section 04 — Export
        gsap.timeline({
          scrollTrigger: {
            trigger: '#section-export',
            start: 'top top',
            end: '+=700',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onEnter:     () => setActiveSection(3),
            onEnterBack: () => setActiveSection(3),
          },
        })
          .from('.export-number',  { x: -120, opacity: 0, duration: 1 })
          .from('.export-heading', { y: 70,  opacity: 0, duration: 0.9 }, '-=0.5')
          .from('.export-content', { opacity: 0, y: 40,  duration: 0.8 }, '-=0.4')

        // Global green shapes parallax (across all scroll)
        gsap.to('.green-shape', {
          y: (i) => (i % 2 === 0 ? -150 : 100),
          ease: 'none',
          scrollTrigger: {
            trigger: mainRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 3,
          },
        })
      })

      // ── MOBILE (no pinning, simple fade-in) ──
      mm.add('(max-width: 767px)', () => {
        const mobileSections = [
          '#section-upload',
          '#section-configure',
          '#section-clean',
          '#section-export',
        ]
        mobileSections.forEach((sel) => {
          gsap.from(sel + ' .section-inner', {
            opacity: 0,
            y: 40,
            duration: 0.8,
            scrollTrigger: {
              trigger: sel,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          })
        })
        gsap.from('.hero-word', {
          opacity: 0,
          y: 40,
          stagger: 0.1,
          duration: 0.8,
          delay: 0.3,
        })
      })

      return () => mm.revert()
    },
    { scope: mainRef, dependencies: [loaderDone] }
  )

  // Refresh ScrollTrigger when layout changes (file loaded, preview loaded)
  useEffect(() => {
    if (loaderDone) {
      const t = setTimeout(() => ScrollTrigger.refresh(), 100)
      return () => clearTimeout(t)
    }
  }, [fileData, previewData, loaderDone])

  // Fetch preview when cleaning is done
  useEffect(() => {
    if (status === 'done' && jobId && !previewData) {
      getPreview(jobId).then(setPreviewData).catch(console.error)
    }
  }, [status, jobId, previewData])

  // ── HANDLERS ────────────────────────────────────────
  const handleUploadSuccess = (data) => setFileData(data)

  const handleConfigChange = (key, value) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  const handleStartCleaning = async () => {
    if (!fileData) return
    setIsStartingClean(true)
    setCleanError(null)
    try {
      const res = await startCleaning(fileData.file_id, config)
      startJob(res.job_id)
      // Smooth scroll to clean section
      document.getElementById('section-clean')?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      setCleanError(err?.response?.data?.detail || err.message || 'Failed to start')
    } finally {
      setIsStartingClean(false)
    }
  }

  const handleReset = () => {
    reset()
    setFileData(null)
    setConfig(DEFAULT_CONFIG)
    setPreviewData(null)
    setCleanError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // ── RENDER ──────────────────────────────────────────
  return (
    <div ref={mainRef}>
      {/* ── LOADER ── */}
      {!loaderDone && <Loader onComplete={() => setLoaderDone(true)} />}

      {/* ── CURSOR ── */}
      <CustomCursor />

      {/* ── VERTICAL NAV ── */}
      <VerticalNav activeIndex={activeSection} />

      {/* ── FLOATING STATS ── */}
      <FloatingStats fileData={fileData} progress={progress} status={status} />

      {/* ── NAVBAR ── */}
      <nav className="purixa-nav">
        <div className="nav-wordmark">Purixa</div>
        <div className="nav-links">
          <a href="https://github.com/ARCHIT-100069/Purixa" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://purixa-backend-production.up.railway.app/docs" target="_blank" rel="noreferrer">
            API Docs
          </a>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════ */}
      <section id="hero" className="hero-section">
        {/* Metadata labels */}
        <span className="hero-meta hero-meta-tl">28.6441° N, 77.3910° E</span>
        <span className="hero-meta hero-meta-tr">100% AUTOMATED</span>
        <span className="hero-meta hero-meta-br">PURIXA / DATA CLEANING</span>

        {/* Green shapes */}
        <div className="green-shape green-shape-tri shape-1" />
        <div className="green-shape shape-2" />
        <div className="green-shape shape-3" />

        {/* Hero copy */}
        <div className="hero-content">
          <div className="hero-headline">
            <div className="hero-line">
              <div className="hero-word-wrap"><span className="hero-word">YOUR</span></div>
              <div className="hero-word-wrap"><span className="hero-word">&nbsp;DATA.</span></div>
            </div>
            <div className="hero-line">
              <div className="hero-word-wrap">
                <span className="hero-word hero-word-accent">CLEANED.</span>
              </div>
            </div>
          </div>

          <p className="hero-subtitle">Upload. Configure. Export. Done.</p>

          <a href="#section-upload" className="hero-cta" id="hero-cta-btn">
            Start Cleaning <span aria-hidden>→</span>
          </a>
        </div>

        {/* SVG wireframe */}
        <DataWireframe />

        {/* Scroll hint */}
        <div className="hero-scroll-hint">
          <span>SCROLL</span>
          <div className="scroll-line" />
        </div>

        <div className="section-rule" />
      </section>

      {/* ═══════════════════════════════════════════════
          01 — UPLOAD
      ═══════════════════════════════════════════════ */}
      <section id="section-upload" className="pinned-section">
        <div className="section-number-bg upload-number">01</div>

        <div className="section-inner">
          <span className="section-tag">FILE INGESTION</span>

          <h2 className="section-title upload-heading">
            Drop your<br />dataset.
          </h2>
          <p className="section-subtitle">
            CSV · JSON · TSV — up to 500MB. Large files use chunked streaming.
          </p>

          <div className="upload-grid">
            {/* Left: drop zone */}
            <div className="upload-zone">
              <DropZone onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* Right: file stats + CTA */}
            {fileData ? (
              <div className="upload-meta upload-stats-panel">
                <FileStats fileData={fileData} />
                <button
                  id="configure-scroll-btn"
                  className="mantis-cta"
                  onClick={() => scrollTo('section-configure')}
                >
                  Configure Operations →
                </button>
              </div>
            ) : (
              <div className="upload-meta" style={{ display: 'flex', alignItems: 'center' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                  AWAITING FILE INPUT
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="section-rule" />
      </section>

      {/* ═══════════════════════════════════════════════
          02 — CONFIGURE
      ═══════════════════════════════════════════════ */}
      <section id="section-configure" className="pinned-section">
        <div className="section-number-bg configure-number">02</div>

        {!fileData && (
          <div className="section-lock-overlay">
            <p>↑ Upload a file first</p>
          </div>
        )}

        <div className="section-inner">
          <span className="section-tag">OPERATIONS</span>

          <h2 className="section-title configure-heading">
            Configure<br />operations.
          </h2>
          <p className="section-subtitle">
            Toggle the cleaning steps to apply to your dataset.
          </p>

          <div className="options-grid-wrapper">
            <CleaningOptions config={config} onChange={handleConfigChange} />
          </div>

          <div className="configure-actions" style={{ marginTop: 32 }}>
            {cleanError && <p className="error-text">{cleanError}</p>}
            <button
              id="start-cleaning-btn"
              className="mantis-cta mantis-cta-primary"
              onClick={handleStartCleaning}
              disabled={!fileData || isStartingClean}
            >
              {isStartingClean ? 'Starting pipeline...' : 'Run Pipeline →'}
            </button>
          </div>
        </div>

        <div className="section-rule" />
      </section>

      {/* ═══════════════════════════════════════════════
          03 — CLEAN
      ═══════════════════════════════════════════════ */}
      <section id="section-clean" className="pinned-section">
        <div className="section-number-bg clean-number">03</div>

        {!jobId && (
          <div className="section-lock-overlay">
            <p>↑ Run the pipeline first</p>
          </div>
        )}

        <div className="section-inner clean-content">
          <span className="section-tag">PROCESSING</span>

          <h2 className="section-title clean-heading">
            {status === 'done' ? 'Complete.' : status === 'error' ? 'Error.' : 'Cleaning.'}
          </h2>
          <p className="section-subtitle">
            {status === 'done'
              ? `${(stats?.rows_after || 0).toLocaleString()} rows in output`
              : 'Processing your dataset...'}
          </p>

          <div className="clean-layout">
            <div>
              <ProgressBar progress={progress} statusText={lastLog} />
            </div>
            <div>
              <CleaningLog log={log} />
            </div>
          </div>

          {status === 'error' && (
            <p className="error-text" style={{ marginTop: 16 }}>{error || 'Unknown error'}</p>
          )}

          {status === 'done' && (
            <button
              id="go-to-export-btn"
              className="mantis-cta"
              onClick={() => scrollTo('section-export')}
            >
              View Results →
            </button>
          )}
        </div>

        <div className="section-rule" />
      </section>

      {/* ═══════════════════════════════════════════════
          04 — EXPORT
      ═══════════════════════════════════════════════ */}
      <section id="section-export" className="pinned-section">
        <div className="section-number-bg export-number">04</div>

        {status !== 'done' && (
          <div className="section-lock-overlay">
            <p>↑ Complete cleaning first</p>
          </div>
        )}

        <div className="section-inner export-content">
          <span className="section-tag">EXPORT</span>

          <h2 className="section-title export-heading">
            Download<br />results.
          </h2>

          <div className="export-layout">
            {previewData && (
              <StatsReport stats={previewData.stats || stats} summary={previewData.summary} />
            )}

            <ExportPanel jobId={jobId} stats={previewData?.stats || stats} />

            {previewData && (
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.2em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                  DATA PREVIEW — FIRST {previewData.rows?.length} ROWS
                </p>
                <DataPreview
                  columns={previewData.columns}
                  rows={previewData.rows}
                  totalRows={previewData.total_rows}
                  columnTypes={previewData.column_types}
                />
              </div>
            )}

            <div>
              <button id="start-over-btn" className="reset-btn" onClick={handleReset}>
                ↺ Start over with a new file
              </button>
            </div>
          </div>
        </div>

        <div className="section-rule" />
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer className="purixa-footer">
        <div className="footer-wordmark">Purixa</div>
        <p className="footer-tagline">Data Cleaning, Refined.</p>
        <p className="footer-meta">
          28.6441° N, 77.3910° E &nbsp;·&nbsp; 2026 &nbsp;·&nbsp;{' '}
          <a
            href="https://github.com/ARCHIT-100069/Purixa"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            github.com/ARCHIT-100069/Purixa
          </a>
        </p>
      </footer>
    </div>
  )
}
