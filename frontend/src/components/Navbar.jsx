import React from 'react'
import { Sparkles } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles size={16} className="text-black" />
          </div>
          <div>
            <span className="display-font text-xl font-bold text-text tracking-tight">Purixa</span>
          </div>
        </div>

        {/* Tagline */}
        <div className="hidden md:block">
          <span className="text-sm text-muted tracking-widest uppercase font-light mono">
            Data Cleaning, Refined
          </span>
        </div>

        {/* CTA */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-dim border border-border px-4 py-1.5 rounded-full hover:border-accent/50 hover:text-accent transition-all duration-200 mono"
        >
          v1.0.0
        </a>
      </div>
    </nav>
  )
}
