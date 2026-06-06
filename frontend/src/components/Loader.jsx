import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function Loader({ onComplete }) {
  const overlayRef = useRef(null)
  const fillRef = useRef(null)
  const percentRef = useRef(null)
  const wordmarkRef = useRef(null)

  useEffect(() => {
    const obj = { val: 0 }
    const tl = gsap.timeline({
      onComplete: () => {
        // Slide loader up to reveal the page
        gsap.to(overlayRef.current, {
          yPercent: -100,
          duration: 0.9,
          ease: 'power3.inOut',
          onComplete,
        })
      },
    })

    tl
      .to(fillRef.current, {
        width: '100%',
        duration: 1.8,
        ease: 'power2.inOut',
      })
      .to(
        obj,
        {
          val: 100,
          duration: 1.8,
          ease: 'power2.inOut',
          onUpdate() {
            if (percentRef.current) {
              percentRef.current.textContent = `${Math.round(obj.val)}%`
            }
          },
        },
        '<'
      )
      .to(
        wordmarkRef.current,
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.8'
      )
      .to({}, { duration: 0.4 }) // brief pause before exit
  }, [onComplete])

  return (
    <div ref={overlayRef} className="loader-overlay">
      {/* Horizontal line track */}
      <div className="loader-line-track">
        <div ref={fillRef} className="loader-line-fill" />
      </div>

      {/* Percentage counter */}
      <span ref={percentRef} className="loader-percent">0%</span>

      {/* Wordmark */}
      <div ref={wordmarkRef} className="loader-wordmark">
        Purixa
      </div>
    </div>
  )
}
