'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { useRef, useState, useCallback } from 'react'
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
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
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
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files
        if (files && files.length > 0) {
          event.preventDefault()
          handleFiles(Array.from(files))
          return true
        }
        return false
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files
        if (files && files.length > 0) {
          event.preventDefault()
          handleFiles(Array.from(files))
          return true
        }
        return false
      },
    },
  })

  const handleFiles = useCallback(async (files: File[]) => {
    if (!editor) return

    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    setUploading(true)

    // 선택 순서대로 하나씩 업로드 & 즉시 삽입
    for (const file of imageFiles) {
      try {
        const formData = new FormData()
        formData.set('file', file)

        const result = await uploadImage(formData)
        if (result.error) {
          console.error('업로드 에러:', result.error)
          alert('이미지 업로드 실패: ' + result.error)
          continue
        }
        if (result.url) {
          editor.commands.focus('end')
          editor.chain().insertContent('<p></p>').run()
          editor.chain().focus().setImage({ src: result.url }).run()
        }
      } catch (err) {
        console.error('업로드 예외:', err)
        alert('이미지 업로드 중 오류가 발생했습니다.')
      }
    }
    // 마지막에 빈 줄 추가
    editor.chain().focus('end').insertContent('<p></p>').run()

    setUploading(false)
  }, [editor])

  if (!editor) return null

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !editor) return

    await handleFiles(Array.from(files))

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        dragOver ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300'
      } transition-colors`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => setDragOver(false)}
    >
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 p-2">
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
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />

        {uploading && (
          <span className="ml-2 text-xs text-zinc-500">
            업로드 중...
          </span>
        )}
      </div>

      {/* 에디터 */}
      <div className="relative bg-white">
        <EditorContent editor={editor} />
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-900/10">
            <p className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-zinc-900 shadow-lg">
              이미지를 여기에 놓으세요
            </p>
          </div>
        )}
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
