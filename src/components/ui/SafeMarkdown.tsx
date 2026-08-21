import React from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

export interface SafeMarkdownProps {
  content?: string | null
  className?: string
  stripLinks?: boolean
}

function isSafeUrl(url?: string): boolean {
  if (!url) return false
  const trimmed = url.trim().toLowerCase()
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:')
  ) {
    return false
  }
  return true
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    if (!href || !isSafeUrl(href)) {
      return <span>{children}</span>
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        {...props}
      >
        {children}
      </a>
    )
  },
}

const markdownComponentsStripLinks: Components = {
  ...markdownComponents,
  a: ({ children }) => <span>{children}</span>,
}

const markdownPlugins = [remarkGfm]

export const SafeMarkdown = React.memo(function SafeMarkdown({
  content,
  className,
  stripLinks = false,
}: SafeMarkdownProps) {
  if (!content || !content.trim()) {
    return null
  }

  return (
    <div
      className={cn(
        'prose prose-invert max-w-none text-sm text-white/80 leading-relaxed [&_a]:text-violet-300 [&_a]:underline hover:[&_a]:text-violet-200 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-violet-200 [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:rounded-lg [&_blockquote]:border-l-2 [&_blockquote]:border-violet-400 [&_blockquote]:pl-3 [&_blockquote]:text-white/60',
        className,
      )}
    >
      <Markdown
        remarkPlugins={markdownPlugins}
        components={stripLinks ? markdownComponentsStripLinks : markdownComponents}
      >
        {content}
      </Markdown>
    </div>
  )
})
