import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Nodes and connection data for the data-network wireframe
const NODES = [
  { id: 'n1',  cx: 120,  cy: 80  },
  { id: 'n2',  cx: 280,  cy: 50  },
  { id: 'n3',  cx: 440,  cy: 110 },
  { id: 'n4',  cx: 560,  cy: 60  },
  { id: 'n5',  cx: 80,   cy: 220 },
  { id: 'n6',  cx: 210,  cy: 200 },
  { id: 'n7',  cx: 360,  cy: 240 },
  { id: 'n8',  cx: 510,  cy: 190 },
  { id: 'n9',  cx: 620,  cy: 220 },
  { id: 'n10', cx: 150,  cy: 350 },
  { id: 'n11', cx: 300,  cy: 380 },
  { id: 'n12', cx: 470,  cy: 340 },
  { id: 'n13', cx: 580,  cy: 380 },
  { id: 'n14', cx: 240,  cy: 490 },
  { id: 'n15', cx: 420,  cy: 500 },
]
const EDGES = [
  ['n1','n2'], ['n2','n3'], ['n3','n4'], ['n1','n5'], ['n1','n6'],
  ['n2','n6'], ['n3','n7'], ['n4','n8'], ['n4','n9'],
  ['n5','n10'], ['n6','n11'], ['n7','n11'], ['n7','n12'],
  ['n8','n12'], ['n9','n13'], ['n10','n14'], ['n11','n14'],
  ['n12','n15'], ['n13','n15'], ['n14','n15'],
  ['n6','n7'], ['n8','n9'],
]
const ACCENT_NODES = new Set(['n2', 'n7', 'n12', 'n15'])
const ACCENT_EDGES = new Set([
  JSON.stringify(['n2','n7']),
  JSON.stringify(['n7','n12']),
  JSON.stringify(['n12','n15']),
])

function getNode(id) {
  return NODES.find(n => n.id === id)
}

export default function DataWireframe() {
  const svgRef = useRef(null)

  useEffect(() => {
    const paths = svgRef.current?.querySelectorAll('.wire-path')
    const nodes = svgRef.current?.querySelectorAll('.wire-node')
    if (!paths || !nodes) return

    // Set initial dasharray/dashoffset for path draw animation
    paths.forEach((path) => {
      const len = path.getTotalLength?.() || 200
      path.style.strokeDasharray = len
      path.style.strokeDashoffset = len
    })

    // Animate paths drawing in
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 0.6,
      stagger: 0.04,
      ease: 'power1.inOut',
      delay: 0.3,
    })

    // Animate nodes fading in
    gsap.from(nodes, {
      opacity: 0,
      scale: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'back.out(1.5)',
      delay: 0.2,
      transformOrigin: 'center center',
    })
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        right: '0',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '55%',
        maxWidth: '680px',
        opacity: 0.55,
        pointerEvents: 'none',
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 680 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto' }}
      >
        {/* Edges */}
        {EDGES.map(([from, to]) => {
          const a = getNode(from)
          const b = getNode(to)
          if (!a || !b) return null
          const key = JSON.stringify([from, to])
          const isAccent = ACCENT_EDGES.has(key)
          return (
            <line
              key={key}
              className="wire-path"
              x1={a.cx} y1={a.cy}
              x2={b.cx} y2={b.cy}
              stroke={isAccent ? '#4DE069' : '#0A0A0A'}
              strokeWidth={isAccent ? 1.5 : 0.8}
              opacity={isAccent ? 0.9 : 0.35}
            />
          )
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const isAccent = ACCENT_NODES.has(node.id)
          return (
            <circle
              key={node.id}
              className="wire-node"
              cx={node.cx}
              cy={node.cy}
              r={isAccent ? 6 : 3}
              fill={isAccent ? '#4DE069' : 'none'}
              stroke={isAccent ? '#4DE069' : '#0A0A0A'}
              strokeWidth={1}
              opacity={isAccent ? 1 : 0.5}
            />
          )
        })}

        {/* Label on accent nodes */}
        {[...ACCENT_NODES].map((id) => {
          const node = getNode(id)
          if (!node) return null
          return (
            <text
              key={`lbl-${id}`}
              x={node.cx + 10}
              y={node.cy + 4}
              fontSize="8"
              fill="#4DE069"
              fontFamily="'Space Mono', monospace"
              opacity={0.8}
            >
              {id.toUpperCase()}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
