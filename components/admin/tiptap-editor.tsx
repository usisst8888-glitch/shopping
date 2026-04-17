'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { useRef } from 'react'
import { uploadImage } from '@/app/admin/(dashboard)/products/actions'

export function TiptapEditor({
  content,
  onChange,
  minHeight = '300px',
}: {
  content: string
  onChange: (html: string) => void
  minHeight?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none px-4 py-3 focus:outline-none`,
        style: `min-height: ${minHeight}`,
      },
    },
  })

  if (!editor) return null

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    const formData = new FormData()
    formData.set('file', file)
    formData.set('folder', 'descriptions')

    const result = await uploadImage(formData)
    if (result.url) {
      editor.chain().focus().setImage({ src: result.url }).run()
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 bg-zinc-50 p-2">
        <ToolButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolButton>
        <ToolButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolButton>
        <ToolButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </ToolButton>

        <div className="mx-1 w-px bg-zinc-200" />

        <ToolButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolButton>
        <ToolButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolButton>

        <div className="mx-1 w-px bg-zinc-200" />

        <ToolButton
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          좌
        </ToolButton>
        <ToolButton
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          중
        </ToolButton>
        <ToolButton
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          우
        </ToolButton>

        <div className="mx-1 w-px bg-zinc-200" />

        <ToolButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          UL
        </ToolButton>
        <ToolButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          OL
        </ToolButton>

        <div className="mx-1 w-px bg-zinc-200" />

        <ToolButton
          active={false}
          onClick={() => fileInputRef.current?.click()}
        >
          이미지
        </ToolButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* 에디터 */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition ${
        active
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-600 hover:bg-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}
