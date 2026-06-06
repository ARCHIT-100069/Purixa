const LABELS = ['UPLOAD', 'CONFIGURE', 'CLEAN', 'EXPORT']

export default function VerticalNav({ activeIndex }) {
  return (
    <nav className="vertical-nav" aria-label="Section navigation">
      {LABELS.map((label, idx) => (
        <>
          {idx > 0 && <div key={`div-${idx}`} className="vertical-nav-divider" />}
          <span
            key={label}
            className={`vertical-nav-item ${activeIndex === idx ? 'active' : ''}`}
          >
            {label}
          </span>
        </>
      ))}
    </nav>
  )
}
