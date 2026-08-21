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
  h1: ({ children, ...props }) => (
    <h1 className="mt-4 mb-2 text-2xl font-black tracking-tight text-white first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mt-3.5 mb-1.5 text-xl font-bold tracking-tight text-white first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-3 mb-1 text-base font-bold tracking-tight text-white/95 first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="mt-2 mb-1 text-sm font-bold text-white/90 first:mt-0" {...props}>
      {children}
    </h4>
  ),
  hr: (props) => <hr className="my-4 border-white/10" {...props} />,
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
        'prose prose-invert max-w-none text-sm text-white/80 leading-relaxed [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:tracking-tight [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-3.5 [&_h2]:mb-1.5 [&_h2]:tracking-tight [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-white/95 [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:tracking-tight [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-white/90 [&_a]:text-violet-300 [&_a]:underline hover:[&_a]:text-violet-200 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-violet-200 [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:rounded-lg [&_blockquote]:border-l-2 [&_blockquote]:border-violet-400 [&_blockquote]:pl-3 [&_blockquote]:text-white/60 [&_hr]:my-4 [&_hr]:border-white/10',
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
