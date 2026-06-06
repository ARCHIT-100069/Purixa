import { useEffect, useRef } from 'react'
import crystalImg from '../assets/crystal.png'

/* ─────────────────────────────────────────────────
   Motion constants
───────────────────────────────────────────────── */
const LERP          = 0.04
const FLOAT_AMP     = 15
const FLOAT_PERIOD  = 8000   // ms
const ROT_Z_SPEED   = 2.0    // °/s — one rev per 180s
const TILT_MAX      = 12     // max ±° rotateX/Y from mouse
const PARALLAX_X    = 52
const PARALLAX_Y    = 36

export default function HeroCrystal() {
  const innerRef = useRef(null)

  useEffect(() => {
    let raf
    let rotZ = 0
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

      cMX += (tMX - cMX) * LERP
      cMY += (tMY - cMY) * LERP

      rotZ += dt * ROT_Z_SPEED

      const floatY      = Math.sin((now / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMP
      const scroll      = window.scrollY
      const scrollTY    = scroll * 0.12
      const scrollTiltX = Math.min(scroll * 0.012, 16)
      const scrollScale = Math.max(0.78, 1 - scroll * 0.00025)

      const tiltX = -cMY * TILT_MAX
      const tiltY =  cMX * TILT_MAX
      const tx    = cMX * PARALLAX_X
      const ty    = cMY * PARALLAX_Y + floatY - scrollTY

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
    <div
      style={{
        position:          'absolute',
        top: 0, right: 0, bottom: 0,
        width:             '56%',
        pointerEvents:     'none',
        display:           'flex',
        alignItems:        'center',
        justifyContent:    'center',
        perspective:       '900px',
        perspectiveOrigin: '50% 50%',
        overflow:          'hidden',
      }}
    >
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
        {/*
          Subtle green ambient glow — very soft, reads as depth not decoration.
          Sized to crystal and slightly offset toward its center of mass.
        */}
        <div
          style={{
            position:   'absolute',
            inset:      '10%',
            background: 'radial-gradient(ellipse 65% 65% at 52% 55%, rgba(77,224,105,0.14) 0%, transparent 75%)',
            filter:     'blur(22px)',
            pointerEvents: 'none',
            zIndex:     0,
          }}
        />

        {/*
          Crystal image — white-bg studio render.
          mix-blend-mode: multiply → white pixels in the image become
          transparent (white × hero-gray = hero-gray), so the crystal
          appears floating on the page with no visible bounding box.
        */}
        <img
          src={crystalImg}
          alt="Purixa emerald crystal"
          draggable={false}
          style={{
            position:    'relative',
            zIndex:      1,
            width:       'clamp(320px, 44vw, 600px)',
            height:      'auto',
            display:     'block',
            userSelect:  'none',
            mixBlendMode: 'multiply',   /* white bg → transparent on gray hero */
          }}
        />
      </div>
    </div>
  )
}
