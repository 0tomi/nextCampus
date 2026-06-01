'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useState } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  RemoveFormatting,
} from 'lucide-react'

interface RichTextEditorProps {
  name: string
  defaultValue?: string
  placeholder?: string
}

export function RichTextEditor({
  name,
  defaultValue = '',
  placeholder,
}: RichTextEditorProps) {
  const [html, setHtml] = useState(defaultValue)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
    ],
    content: defaultValue,
    onUpdate({ editor }) {
      setHtml(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] px-3 py-2 text-sm text-white/90 focus:outline-none prose prose-invert prose-sm max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_a]:text-white [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
  })

  const handleLink = () => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL del enlace:', prev ?? '')
    if (url === null) return // canceló
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    const trimmed = url.trim()
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('mailto:')) {
      window.alert('URL inválida. Usá un enlace que empiece con https:// o mailto:')
      return
    }
    editor.chain().focus().setLink({ href: trimmed }).run()
  }

  return (
    <div className="rounded border border-white/10 bg-surface-0 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/8 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold') ?? false}
          title="Negrita"
          disabled={!editor}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic') ?? false}
          title="Cursiva"
          disabled={!editor}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive('strike') ?? false}
          title="Tachado"
          disabled={!editor}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-white/10" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive('heading', { level: 2 }) ?? false}
          title="Título 2"
          disabled={!editor}
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive('heading', { level: 3 }) ?? false}
          title="Título 3"
          disabled={!editor}
        >
          <Heading3 className="size-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-white/10" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList') ?? false}
          title="Lista"
          disabled={!editor}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList') ?? false}
          title="Lista numerada"
          disabled={!editor}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-white/10" />

        <ToolbarButton
          onClick={handleLink}
          active={editor?.isActive('link') ?? false}
          title="Agregar enlace"
          disabled={!editor}
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().unsetLink().run()}
          active={false}
          title="Quitar enlace"
          disabled={!editor || !editor.isActive('link')}
        >
          <Link2Off className="size-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-white/10" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
          active={false}
          title="Quitar formato"
          disabled={!editor}
        >
          <RemoveFormatting className="size-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Hidden input for FormData */}
      <input type="hidden" name={name} value={html} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal helper component
// ---------------------------------------------------------------------------
interface ToolbarButtonProps {
  onClick: () => void
  active: boolean
  title: string
  disabled?: boolean
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex size-7 items-center justify-center rounded text-xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-white/15 text-white'
          : 'text-white/50 hover:bg-white/8 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
