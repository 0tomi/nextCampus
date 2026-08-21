'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Bold,
  Italic,
  Heading3,
  List,
  Code,
  Link2,
  PenLine,
  Eye,
} from 'lucide-react'
import { SafeMarkdown } from '@/components/ui/SafeMarkdown'
import { cn } from '@/lib/utils'

export interface MarkdownEditorProps {
  name: string
  defaultValue?: string
  placeholder?: string
  rows?: number
  className?: string
}

export function MarkdownEditor({
  name,
  defaultValue = '',
  placeholder = 'Escribí contenido en Markdown...',
  rows = 6,
  className,
}: MarkdownEditorProps) {
  const [value, setValue] = useState(defaultValue)
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyFormat = useCallback(
    (formatter: (selected: string) => { text: string; selectOffsetStart: number; selectOffsetEnd: number }) => {
      setActiveTab('write')
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = value.substring(start, end)
      const { text, selectOffsetStart, selectOffsetEnd } = formatter(selected)

      const newValue = value.substring(0, start) + text + value.substring(end)
      setValue(newValue)

      requestAnimationFrame(() => {
        if (!textareaRef.current) return
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(
          start + selectOffsetStart,
          start + selectOffsetEnd,
        )
      })
    },
    [value],
  )

  const handleBold = () => {
    applyFormat((selected) => {
      const content = selected || 'texto en negrita'
      return {
        text: `**${content}**`,
        selectOffsetStart: 2,
        selectOffsetEnd: 2 + content.length,
      }
    })
  }

  const handleItalic = () => {
    applyFormat((selected) => {
      const content = selected || 'texto en cursiva'
      return {
        text: `*${content}*`,
        selectOffsetStart: 1,
        selectOffsetEnd: 1 + content.length,
      }
    })
  }

  const handleHeading = () => {
    applyFormat((selected) => {
      const content = selected || 'Título'
      return {
        text: `### ${content}\n`,
        selectOffsetStart: 4,
        selectOffsetEnd: 4 + content.length,
      }
    })
  }

  const handleList = () => {
    applyFormat((selected) => {
      if (!selected) {
        return {
          text: '- Elemento de lista\n',
          selectOffsetStart: 2,
          selectOffsetEnd: 19,
        }
      }
      const lines = selected.split('\n')
      const formatted = lines.map((l) => (l.startsWith('- ') ? l : `- ${l}`)).join('\n')
      return {
        text: formatted,
        selectOffsetStart: 0,
        selectOffsetEnd: formatted.length,
      }
    })
  }

  const handleCode = () => {
    applyFormat((selected) => {
      const content = selected || '// código'
      return {
        text: `\`\`\`\n${content}\n\`\`\`\n`,
        selectOffsetStart: 4,
        selectOffsetEnd: 4 + content.length,
      }
    })
  }

  const handleLink = () => {
    const url = window.prompt('URL del enlace:', 'https://')
    if (url === null) return
    const trimmed = url.trim()
    if (!trimmed) return

    if (
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('mailto:') &&
      !trimmed.startsWith('/')
    ) {
      window.alert('Por favor ingresá una URL válida (ej: https://ejemplo.com o mailto:correo@ejemplo.com)')
      return
    }

    applyFormat((selected) => {
      const label = selected || 'enlace'
      const markdownLink = `[${label}](${trimmed})`
      return {
        text: markdownLink,
        selectOffsetStart: 1,
        selectOffsetEnd: 1 + label.length,
      }
    })
  }

  return (
    <div
      className={cn(
        'group rounded-lg border border-white/10 bg-surface-0 transition-colors focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400/20',
        className,
      )}
    >
      {/* Header: Toolbar + Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-white/[0.02] px-2.5 py-1.5">
        {/* Format Toolbar */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={handleBold} title="Negrita (**texto**)">
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={handleItalic} title="Cursiva (*texto*)">
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={handleHeading} title="Encabezado (### Título)">
            <Heading3 className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-3.5 w-px bg-white/10" aria-hidden="true" />

          <ToolbarButton onClick={handleList} title="Lista con viñetas (- Item)">
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={handleCode} title="Bloque de código (```)">
            <Code className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={handleLink} title="Insertar enlace ([texto](url))">
            <Link2 className="size-3.5" />
          </ToolbarButton>
        </div>

        {/* Tabs: Escribir / Vista previa */}
        <div className="flex items-center rounded-md border border-white/10 bg-black/30 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-all',
              activeTab === 'write'
                ? 'bg-violet-500/20 text-violet-200 shadow-sm'
                : 'text-white/50 hover:text-white/80',
            )}
          >
            <PenLine className="size-3" />
            Escribir
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-all',
              activeTab === 'preview'
                ? 'bg-violet-500/20 text-violet-200 shadow-sm'
                : 'text-white/50 hover:text-white/80',
            )}
          >
            <Eye className="size-3" />
            Vista previa
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={name}
          name={name}
          rows={rows}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full resize-y bg-transparent px-3 py-2.5 font-mono text-sm text-white/90 placeholder:text-white/30 focus:outline-none leading-relaxed',
            activeTab === 'write' ? 'block' : 'hidden',
          )}
        />

        {activeTab === 'preview' && (
          <div className="min-h-[140px] px-3 py-2.5">
            {value.trim() ? (
              <SafeMarkdown content={value} />
            ) : (
              <p className="text-xs italic text-white/35">
                Nada para previsualizar todavía.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-white/5 px-3 py-1 text-[11px] text-white/30">
        <span>Soporta formato Markdown (GFM)</span>
        <span>{value.length} caracteres</span>
      </div>
    </div>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400"
    >
      {children}
    </button>
  )
}
