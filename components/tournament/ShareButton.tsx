'use client'

import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface ShareButtonProps {
  title: string
  /** URL completa ou path absoluto (ex: /torneio/123) */
  url: string
  variant?: 'icon' | 'full'
}

export function ShareButton({ title, url, variant = 'full' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  function getFullUrl() {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return url.startsWith('http') ? url : `${base}${url}`
  }

  async function handleShare() {
    const fullUrl = getFullUrl()
    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl })
        return
      } catch {
        // usuário cancelou ou não suportado — cai no fallback
      }
    }
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={(e) => { e.preventDefault(); handleShare() }}
        className="p-1.5 text-slate-400 hover:text-navy-600 transition-colors rounded"
        title="Compartilhar"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-2 text-sm font-medium text-white"
    >
      {copied
        ? <><Check className="h-4 w-4" /> Link copiado!</>
        : <><Share2 className="h-4 w-4" /> Compartilhar</>
      }
    </button>
  )
}
