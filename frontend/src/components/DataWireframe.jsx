import { useEffect, useRef } from 'react'

// Node definitions — fractions of canvas size so it's responsive
const NODE_DEFS = [
  // [xFrac, yFrac, phase, isAccent]
  [0.10, 0.18, 0.00, true],
  [0.32, 0.10, 1.30, false],
  [0.58, 0.20, 2.50, true],
  [0.82, 0.08, 0.70, false],
  [0.18, 0.42, 1.90, false],
  [0.44, 0.46, 3.10, false],
  [0.68, 0.36, 1.50, true],
  [0.90, 0.50, 2.30, false],
  [0.08, 0.66, 0.50, false],
  [0.36, 0.74, 2.10, true],
  [0.62, 0.68, 1.00, false],
  [0.86, 0.76, 3.30, false],
  [0.22, 0.88, 1.60, false],
  [0.52, 0.92, 0.30, true],
  [0.76, 0.88, 2.80, false],
]

const EDGES = [
  [0,1],[1,2],[2,3],
  [0,4],[1,5],[2,6],[3,7],
  [4,5],[5,6],[6,7],
  [4,8],[5,9],[6,10],[7,11],
  [8,9],[9,10],[10,11],
  [8,12],[9,13],[10,14],
  [12,13],[13,14],
  [2,9],[6,13],
]

// Accent edges: both endpoints are accent nodes
const ACCENT_SET = new Set(NODE_DEFS.flatMap((n, i) => n[3] ? [i] : []))
function isAccentEdge(a, b) { return ACCENT_SET.has(a) && ACCENT_SET.has(b) }

export default function DataWireframe() {
  const canvasRef  = useRef(null)
  const mouseRef   = useRef({ x: -999, y: -999 })
  const rafRef     = useRef(null)
  const wrapperRef = useRef(null)   // ← new: receives scroll transforms

  // ── Canvas + mouse animation (unchanged) ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Set up canvas DPI
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr  = window.devicePixelRatio || 1
      canvas.width  = rect.width  * dpr
      canvas.height = rect.height * dpr
      canvas.style.width  = rect.width  + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(dpr, dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    // Mouse tracking — relative to canvas position
    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    window.addEventListener('mousemove', onMouse)

    // Animation loop
    const draw = (ts) => {
      const t = ts * 0.001
      const W = canvas.width  / (window.devicePixelRatio || 1)
      const H = canvas.height / (window.devicePixelRatio || 1)

      ctx.clearRect(0, 0, W, H)

      // Compute animated node positions
      const pos = NODE_DEFS.map(([xf, yf, phase]) => ({
        x: xf * W + Math.sin(t * 0.7 + phase) * 10,
        y: yf * H + Math.cos(t * 0.55 + phase) * 8,
      }))

      // Mouse attraction (subtle)
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      pos.forEach((p) => {
        const dx   = mx - p.x
        const dy   = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200 && dist > 0) {
          const f = (1 - dist / 200) * 0.055
          p.x += dx * f
          p.y += dy * f
        }
      })

      // Draw edges
      EDGES.forEach(([a, b]) => {
        const pa = pos[a], pb = pos[b]
        const accent = isAccentEdge(a, b)
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.strokeStyle = accent ? 'rgba(77,224,105,0.85)' : 'rgba(10,10,10,0.22)'
        ctx.lineWidth   = accent ? 1.4 : 0.8
        ctx.stroke()
      })

      // Draw nodes
      NODE_DEFS.forEach((def, i) => {
        const p = pos[i]
        const accent = def[3]
        ctx.beginPath()
        ctx.arc(p.x, p.y, accent ? 5.5 : 2.8, 0, Math.PI * 2)
        if (accent) {
          ctx.fillStyle = '#4DE069'
          ctx.fill()
        } else {
          ctx.strokeStyle = 'rgba(10,10,10,0.28)'
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      })

      // Floating green diamond (slow drift)
      const dx = 0.50 * W + Math.sin(t * 0.4) * 18
      const dy = 0.55 * H + Math.cos(t * 0.3) * 14
      ctx.save()
      ctx.translate(dx, dy)
      ctx.rotate(Math.PI / 4 + t * 0.05)
      ctx.fillStyle = 'rgba(77,224,105,0.70)'
      ctx.fillRect(-10, -10, 20, 20)
      ctx.restore()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMouse)
      ro.disconnect()
    }
  }, [])

  // ── Scroll-driven transform ────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const scrollY    = window.scrollY
      const heroHeight = window.innerHeight

      // 0 at top of hero, 1 when hero fully scrolled past
      const raw      = Math.min(scrollY / heroHeight, 1)
      // Ease-out quadratic: fast start, slows near end (premium feel)
      const progress = 1 - Math.pow(1 - raw, 2)

      const rotate     = progress * 45           // 0 → 45°  clockwise
      const scale      = 1 - progress * 0.25     // 1 → 0.75
      const translateY = progress * -120          // drifts up 120px
      const translateX = progress * 60            // drifts right 60px
      const opacity    = 1 - progress * 0.85      // 1 → 0.15

      wrapper.style.transform = `translateY(${translateY}px) translateX(${translateX}px) rotate(${rotate}deg) scale(${scale})`
      wrapper.style.opacity   = opacity
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // Run once immediately to sync with any initial scroll position
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0,
        width: '56%',
        pointerEvents: 'none',
      }}
    >
      {/* ── Scroll-animated wrapper ── */}
      <div
        ref={wrapperRef}
        id="wireframe-wrapper"
        style={{
          width:           '100%',
          height:          '100%',
          transformOrigin: 'center center',
          willChange:      'transform, opacity',
          transition:      'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', opacity: 0.65 }}
        />
      </div>
    </div>
  )
}
