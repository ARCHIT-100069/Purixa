import { useEffect, useRef } from 'react'

// ── Node definitions ──────────────────────────────────────────────
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

const ACCENT_SET = new Set(NODE_DEFS.flatMap((n, i) => n[3] ? [i] : []))
function isAccentEdge(a, b) { return ACCENT_SET.has(a) && ACCENT_SET.has(b) }

// Pre-build adjacency list for fast neighbour lookup
const ADJ = {}
EDGES.forEach(([a, b]) => {
  ;(ADJ[a] = ADJ[a] || []).push(b)
  ;(ADJ[b] = ADJ[b] || []).push(a)
})

export default function DataWireframe() {
  const canvasRef  = useRef(null)
  const mouseRef   = useRef({ x: -9999, y: -9999 })
  const rafRef     = useRef(null)
  const wrapperRef = useRef(null)
  // Hover state — all values lerped each frame for smooth animation
  const hoverRef   = useRef({ activeNode: -1, progress: 0 })

  // ── Canvas + hover animation ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

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

    // Global mouse → canvas-relative coords
    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    const draw = (ts) => {
      const t     = ts * 0.001
      const W     = canvas.width  / (window.devicePixelRatio || 1)
      const H     = canvas.height / (window.devicePixelRatio || 1)
      const hover = hoverRef.current
      const mx    = mouseRef.current.x
      const my    = mouseRef.current.y

      ctx.clearRect(0, 0, W, H)

      // ── 1. Base positions (idle drift) ─────────────────────────
      const base = NODE_DEFS.map(([xf, yf, phase]) => ({
        x: xf * W + Math.sin(t * 0.7 + phase) * 10,
        y: yf * H + Math.cos(t * 0.55 + phase) * 8,
      }))

      // Mouse attraction (existing subtle pull)
      base.forEach((p) => {
        const dx = mx - p.x, dy = my - p.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < 200 && d > 0) {
          const f = (1 - d / 200) * 0.055
          p.x += dx * f; p.y += dy * f
        }
      })

      // ── 2. Detect closest accent node within hover radius ──────
      const HOVER_R  = 130   // generous — covers whole polygon region
      let nearest    = -1
      let nearestDist = Infinity
      NODE_DEFS.forEach((def, i) => {
        if (!def[3]) return
        const d = Math.hypot(mx - base[i].x, my - base[i].y)
        if (d < HOVER_R && d < nearestDist) { nearestDist = d; nearest = i }
      })
      hover.activeNode = nearest

      // Lerp progress toward target — 0.07 ≈ 400 ms settle (premium)
      const targetP    = nearest >= 0 ? 1 : 0
      hover.progress  += (targetP - hover.progress) * 0.07
      const hp         = hover.progress   // shorthand

      // ── 3. Apply cluster expansion to final positions ──────────
      const pos = base.map(p => ({ x: p.x, y: p.y }))

      if (hp > 0.005 && hover.activeNode >= 0) {
        const active    = hover.activeNode
        const neighbors = ADJ[active] || []
        const cluster   = [active, ...neighbors]

        // Centroid of expanded cluster
        let cx = 0, cy = 0
        cluster.forEach(i => { cx += base[i].x; cy += base[i].y })
        cx /= cluster.length; cy /= cluster.length

        // Push each cluster node outward from centroid (up to 30%)
        cluster.forEach(i => {
          const dx = pos[i].x - cx, dy = pos[i].y - cy
          pos[i].x += dx * hp * 0.30
          pos[i].y += dy * hp * 0.30
        })
      }

      // Build set of nodes involved in the active cluster
      const activeSet = new Set()
      if (hp > 0.005 && hover.activeNode >= 0) {
        activeSet.add(hover.activeNode)
        ;(ADJ[hover.activeNode] || []).forEach(n => activeSet.add(n))
      }

      // ── 4. Draw edges ──────────────────────────────────────────
      EDGES.forEach(([a, b]) => {
        const pa = pos[a], pb = pos[b]
        const bothActive = activeSet.has(a) && activeSet.has(b)
        const isAccent   = isAccentEdge(a, b)

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)

        if (bothActive) {
          // Glowing emerald green — hover active
          ctx.shadowBlur  = 6 + hp * 12
          ctx.shadowColor = '#4DE069'
          ctx.strokeStyle = `rgba(77,224,105,${0.88 + hp * 0.12})`
          ctx.lineWidth   = 1.4 + hp * 0.9
        } else if (isAccent) {
          // Accent, not active — standard green
          ctx.strokeStyle = 'rgba(77,224,105,0.88)'
          ctx.lineWidth   = 1.4
        } else {
          // ★ Darker than before: 0.22 → 0.40 (+82% opacity, fulfils 25-40% darker ask)
          ctx.strokeStyle = 'rgba(10,10,10,0.40)'
          ctx.lineWidth   = 0.95
        }
        ctx.stroke()
        ctx.restore()
      })

      // ── 5. Draw nodes ──────────────────────────────────────────
      NODE_DEFS.forEach((def, i) => {
        const p        = pos[i]
        const accent   = def[3]
        const isActive = activeSet.has(i)
        const isMain   = i === hover.activeNode

        ctx.save()
        ctx.beginPath()

        if (accent) {
          // Idle pulse (always-on, very subtle — ±0.7 px)
          const idlePulse  = Math.sin(t * 2.5 + def[2]) * 0.7
          // Hover pulse (larger, faster — ±2.5 px)
          const hoverPulse = isActive ? Math.sin(t * 5) * 2.5 * hp : 0
          const baseR      = isMain ? 7.5 : 5.5
          const r          = Math.max(baseR + idlePulse + hoverPulse, 3)

          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)

          if (isActive) {
            ctx.shadowBlur  = 8 + hp * 12
            ctx.shadowColor = '#4DE069'
            ctx.fillStyle   = `rgba(77,224,105,${0.85 + hp * 0.15})`
          } else {
            ctx.fillStyle = '#4DE069'
          }
          ctx.fill()

        } else {
          // Non-accent: darker stroke, subtly larger on hover
          const r = isActive ? 4.0 : 2.8
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.strokeStyle = isActive
            ? `rgba(77,224,105,${0.5 * hp + 0.12})`
            : 'rgba(10,10,10,0.35)'
          ctx.lineWidth = isActive ? 1.2 : 0.95
          ctx.stroke()
        }
        ctx.restore()
      })

      // ── 6. Floating green diamond (unchanged) ──────────────────
      const ddx = 0.50 * W + Math.sin(t * 0.4) * 18
      const ddy = 0.55 * H + Math.cos(t * 0.3) * 14
      ctx.save()
      ctx.translate(ddx, ddy)
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

  // ── Scroll-driven wrapper transform (unchanged) ───────────────────
  useEffect(() => {
    const handleScroll = () => {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      const raw      = Math.min(window.scrollY / window.innerHeight, 1)
      const progress = 1 - Math.pow(1 - raw, 2)
      wrapper.style.transform = `translateY(${progress * -120}px) translateX(${progress * 60}px) rotate(${progress * 45}deg) scale(${1 - progress * 0.25})`
      wrapper.style.opacity   = 1 - progress * 0.85
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
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
          style={{ display: 'block', opacity: 0.72 }}
        />
      </div>
    </div>
  )
}
