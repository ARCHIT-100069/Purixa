import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────
   Motion constants
───────────────────────────────────────────────── */
const LERP         = 0.04   // mouse smoothing (lower = more inertia / dreamier)
const ROT_SPEED    = 3.5    // °/s — one revolution every ~103 seconds (organic, not mechanical)
const FLOAT_AMP    = 12     // ±px vertical drift
const FLOAT_PERIOD = 9000   // ms per float cycle
const TILT_MAX     = 14     // max rotateX/Y degrees from mouse (3D lean)
const PARALLAX_X   = 60     // px horizontal parallax range
const PARALLAX_Y   = 40     // px vertical parallax range

export default function PurixaLogo() {
  const innerRef = useRef(null)

  useEffect(() => {
    let raf
    let rotDeg = 0
    // Normalized mouse position: -0.5 → +0.5
    let tMX = 0, tMY = 0
    let cMX = 0, cMY = 0
    let last = performance.now()

    const onMouse = (e) => {
      tMX = e.clientX / window.innerWidth  - 0.5
      tMY = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Lerp toward mouse with inertia
      cMX += (tMX - cMX) * LERP
      cMY += (tMY - cMY) * LERP

      // Very slow organic rotation
      rotDeg += dt * ROT_SPEED

      // Gentle float
      const floatY = Math.sin((now / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMP

      // Scroll influence
      const scroll     = window.scrollY
      const scrollTY   = scroll * 0.12               // rises on scroll
      const scrollTiltX = Math.min(scroll * 0.014, 18) // leans back (max 18°)
      const scrollScale = Math.max(0.75, 1 - scroll * 0.00028)

      // 3D tilt from mouse: rotateX ↔ mouse Y, rotateY ↔ mouse X
      const tiltX = -cMY * TILT_MAX
      const tiltY =  cMX * TILT_MAX

      // Translation parallax
      const tx = cMX * PARALLAX_X
      const ty = cMY * PARALLAX_Y + floatY - scrollTY

      if (innerRef.current) {
        innerRef.current.style.transform = [
          `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px)`,
          `rotateX(${(tiltX + scrollTiltX).toFixed(2)}deg)`,
          `rotateY(${tiltY.toFixed(2)}deg)`,
          `rotateZ(${rotDeg.toFixed(2)}deg)`,
          `scale(${scrollScale.toFixed(4)})`,
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
        perspective: '900px',        /* 3D depth field */
        perspectiveOrigin: '50% 50%',
        overflow: 'hidden',
      }}
    >
      <div
        ref={innerRef}
        style={{
          willChange: 'transform',
          transformStyle: 'preserve-3d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        {/*
          The mark: 3 bold rounded rectangles at 0° / 60° / 120°
          → 6 arms, rotationally symmetric.
          Nothing else. No orbits, no dots, no decorations.
        */}
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width:   'clamp(300px, 38vw, 520px)',
            height:  'clamp(300px, 38vw, 520px)',
            display: 'block',
            opacity: 0.88,
          }}
        >
          {/* Spoke 1 — horizontal */}
          <rect x="4" y="88" width="192" height="24" rx="12" fill="#0A0A0A" />

          {/* Spoke 2 — 60° */}
          <rect
            x="4" y="88" width="192" height="24" rx="12"
            fill="#0A0A0A"
            transform="rotate(60 100 100)"
          />

          {/* Spoke 3 — 120° */}
          <rect
            x="4" y="88" width="192" height="24" rx="12"
            fill="#0A0A0A"
            transform="rotate(120 100 100)"
          />

          {/* Single neon green center — the only accent color */}
          <circle cx="100" cy="100" r="12" fill="#4DE069" />
        </svg>
      </div>
    </div>
  )
}
