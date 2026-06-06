import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────
   Tuning constants
───────────────────────────────────────────────── */
const MOUSE_LERP      = 0.055   // parallax smoothing (lower = more inertia)
const MOUSE_RANGE_X   = 38      // ±px horizontal parallax
const MOUSE_RANGE_Y   = 26      // ±px vertical parallax
const ROT_SPEED       = 15      // degrees per second (full rev ≈ 24s)
const FLOAT_AMP       = 22      // ±px floating Y amplitude
const FLOAT_FREQ      = 0.00105 // radians per ms  (period ≈ 6s)
const SCROLL_Y_FACTOR = 0.10    // logo rises as user scrolls
const SCROLL_R_FACTOR = 0.022   // extra rotation per scroll px
const SCROLL_S_FACTOR = 0.00022 // scale shrink per scroll px (min 0.72)

export default function PurixaLogo() {
  const innerRef = useRef(null)

  useEffect(() => {
    let raf
    let rotDeg  = 0
    let tMX = 0, tMY = 0     // target mouse offset
    let cMX = 0, cMY = 0     // current (lerped)
    let last = performance.now()

    /* ── Mouse tracking ── */
    const onMouse = (e) => {
      tMX = (e.clientX / window.innerWidth  - 0.5) * MOUSE_RANGE_X * 2
      tMY = (e.clientY / window.innerHeight - 0.5) * MOUSE_RANGE_Y * 2
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    /* ── Animation loop ── */
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Mouse inertia
      cMX += (tMX - cMX) * MOUSE_LERP
      cMY += (tMY - cMY) * MOUSE_LERP

      // Continuous rotation
      rotDeg += dt * ROT_SPEED

      // Floating
      const floatY = Math.sin(now * FLOAT_FREQ) * FLOAT_AMP

      // Scroll influence
      const scroll   = window.scrollY
      const scrollTY = scroll * SCROLL_Y_FACTOR
      const scrollR  = scroll * SCROLL_R_FACTOR
      const scrollS  = Math.max(0.72, 1 - scroll * SCROLL_S_FACTOR)

      if (innerRef.current) {
        innerRef.current.style.transform = [
          `translate(${cMX.toFixed(2)}px, ${(cMY + floatY - scrollTY).toFixed(2)}px)`,
          `rotate(${(rotDeg + scrollR).toFixed(2)}deg)`,
          `scale(${scrollS.toFixed(4)})`,
        ].join(' ')
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0,
        width: '56%',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        /* Hide on small screens so text isn't obscured */
        overflow: 'hidden',
      }}
    >
      <div
        ref={innerRef}
        style={{ willChange: 'transform' }}
        aria-hidden="true"
      >
        <PurixaMark />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────
   SVG mark — 6-spoke asterisk with green accents
   Designed to look great at any rotation angle.
───────────────────────────────────────────────── */
function PurixaMark() {
  // 6 spoke tip positions (unit circle r=82, 0° offset)
  const TIPS = Array.from({ length: 6 }, (_, i) => {
    const rad = (i * 60 - 90) * (Math.PI / 180)
    return { cx: 100 + Math.cos(rad) * 82, cy: 100 + Math.sin(rad) * 82 }
  })

  return (
    <svg
      width="clamp(180px, 24vw, 320px)"
      height="clamp(180px, 24vw, 320px)"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', opacity: 0.88 }}
    >
      {/* ── Outer dashed orbit ring ── */}
      <circle
        cx="100" cy="100" r="94"
        stroke="#0A0A0A"
        strokeWidth="0.8"
        strokeDasharray="3 9"
        opacity="0.12"
      />

      {/* ── 3 thick spokes → 6 arms (each rect covers 2 tips) ── */}
      {[0, 60, 120].map(angle => (
        <rect
          key={angle}
          x="12" y="89"
          width="176" height="22"
          rx="11"
          fill="#0A0A0A"
          opacity="0.90"
          transform={`rotate(${angle} 100 100)`}
        />
      ))}

      {/* ── Neon green accent circles at 6 spoke tips ── */}
      {TIPS.map(({ cx, cy }, i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill="#4DE069" />
      ))}

      {/* ── Secondary accent ring at mid-radius ── */}
      {Array.from({ length: 6 }, (_, i) => {
        const rad = (i * 60 - 90) * (Math.PI / 180)
        return (
          <circle
            key={`mid-${i}`}
            cx={100 + Math.cos(rad) * 52}
            cy={100 + Math.sin(rad) * 52}
            r="4"
            fill="#4DE069"
            opacity="0.35"
          />
        )
      })}

      {/* ── Center ring (green outer, dark inner) ── */}
      <circle cx="100" cy="100" r="21" fill="#4DE069" />
      <circle cx="100" cy="100" r="13" fill="#0A0A0A" />
      <circle cx="100" cy="100" r="5"  fill="#4DE069" />
    </svg>
  )
}
