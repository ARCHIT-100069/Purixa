import { useEffect, useRef } from 'react'
import crystalImg from '../assets/crystal.jpg'

/* ─────────────────────────────────────────────────
   Motion constants — tuned for premium agency feel
───────────────────────────────────────────────── */
const LERP          = 0.04    // mouse inertia (lower = dreamier)
const FLOAT_AMP     = 15      // ±px vertical drift
const FLOAT_PERIOD  = 8000    // ms per float cycle (~8 seconds)
const ROT_Z_SPEED   = 2.0     // °/s on Z axis — one revolution per 180 seconds
const TILT_MAX      = 12      // max ±° for rotateX/Y from mouse
const PARALLAX_X    = 52      // px horizontal parallax
const PARALLAX_Y    = 36      // px vertical parallax

export default function HeroCrystal() {
  const innerRef = useRef(null)

  useEffect(() => {
    let raf
    let rotZ = 0

    // Normalized mouse: center of screen = (0, 0)
    let tMX = 0, tMY = 0   // target
    let cMX = 0, cMY = 0   // current (lerped)
    let last = performance.now()

    const onMouse = (e) => {
      tMX = e.clientX / window.innerWidth  - 0.5
      tMY = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // Mouse inertia
      cMX += (tMX - cMX) * LERP
      cMY += (tMY - cMY) * LERP

      // Very slow Z rotation — barely perceptible, organic
      rotZ += dt * ROT_Z_SPEED

      // Vertical float
      const floatY = Math.sin((now / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMP

      // Scroll influence
      const scroll      = window.scrollY
      const scrollTY    = scroll * 0.12                     // rises on scroll
      const scrollTiltX = Math.min(scroll * 0.012, 16)     // leans back
      const scrollScale = Math.max(0.78, 1 - scroll * 0.00025) // shrinks slightly

      // 3D tilt from mouse — creates floating-in-space illusion
      const tiltX = -cMY * TILT_MAX  // mouse up → lean forward
      const tiltY =  cMX * TILT_MAX  // mouse right → lean right

      // Translation parallax
      const tx = cMX * PARALLAX_X
      const ty = cMY * PARALLAX_Y + floatY - scrollTY

      if (innerRef.current) {
        innerRef.current.style.transform = [
          `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px)`,
          `rotateX(${(tiltX + scrollTiltX).toFixed(2)}deg)`,
          `rotateY(${tiltY.toFixed(2)}deg)`,
          `rotateZ(${rotZ.toFixed(2)}deg)`,
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
    /* Outer container — same position as DataWireframe / PurixaLogo */
    <div
      style={{
        position:        'absolute',
        top: 0, right: 0, bottom: 0,
        width:           '56%',
        pointerEvents:   'none',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        perspective:     '900px',
        perspectiveOrigin: '50% 50%',
        overflow:        'hidden',
      }}
    >
      {/* Inner — receives all transform animations */}
      <div
        ref={innerRef}
        style={{
          willChange:     'transform',
          transformStyle: 'preserve-3d',
          position:       'relative',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        {/* Ambient green glow — radiates behind the crystal */}
        <div
          style={{
            position:   'absolute',
            inset:      '-15%',
            background: 'radial-gradient(ellipse 70% 70% at 52% 54%, rgba(77,224,105,0.22) 0%, transparent 70%)',
            filter:     'blur(28px)',
            pointerEvents: 'none',
            zIndex:     0,
          }}
        />

        {/* Crystal image — exact asset, no redrawing */}
        <img
          src={crystalImg}
          alt="Purixa emerald crystal"
          draggable={false}
          style={{
            position:   'relative',
            zIndex:     1,
            width:      'clamp(320px, 44vw, 600px)',
            height:     'auto',
            display:    'block',
            userSelect: 'none',
            /*
              Radial mask: fades the dark bg of the image into the hero's
              gray background, preserving the crystal's reflections & glow.
            */
            WebkitMaskImage: 'radial-gradient(ellipse 76% 76% at 52% 54%, black 40%, transparent 100%)',
            maskImage:       'radial-gradient(ellipse 76% 76% at 52% 54%, black 40%, transparent 100%)',
          }}
        />
      </div>
    </div>
  )
}
