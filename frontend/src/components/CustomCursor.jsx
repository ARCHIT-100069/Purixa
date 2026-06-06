import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const cursorRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    const lerp = (a, b, t) => a + (b - a) * t
    let currentX = 0
    let currentY = 0
    let targetX = 0
    let targetY = 0

    const onMouseMove = (e) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    const animate = () => {
      currentX = lerp(currentX, targetX, 0.15)
      currentY = lerp(currentY, targetY, 0.15)
      cursor.style.left = `${currentX}px`
      cursor.style.top = `${currentY}px`
      rafRef.current = requestAnimationFrame(animate)
    }

    const onEnterInteractive = (e) => {
      const el = e.target
      if (el.matches('a, button, [role="button"], .hero-cta, .pill-cta')) {
        const isCta = el.matches('.hero-cta, .pill-cta-solid, .btn-primary')
        cursor.classList.toggle('on-cta', isCta)
        cursor.classList.toggle('hovering', !isCta)
      }
    }

    const onLeaveInteractive = () => {
      cursor.classList.remove('hovering', 'on-cta')
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseover', onEnterInteractive)
    document.addEventListener('mouseout', onLeaveInteractive)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onEnterInteractive)
      document.removeEventListener('mouseout', onLeaveInteractive)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Only render on desktop
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null

  return <div ref={cursorRef} className="custom-cursor" />
}
