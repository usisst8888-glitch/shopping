'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { useRef, useState, useCallback, useEffect } from 'react'

// 이미지에 style 속성 추가
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {}
          return { style: attributes.style }
        },
      },
    }
  },
})

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
  const [imageSelected, setImageSelected] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      CustomImage.configure({ inline: false }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onSelectionUpdate: ({ editor }) => {
      setImageSelected(editor.isActive('image'))
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

    for (const file of imageFiles) {
      try {
        const formData = new FormData()
        formData.set('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const result = await res.json()

        if (result.error) {
          alert('이미지 업로드 실패: ' + result.error)
          continue
        }
        if (result.url) {
          editor.commands.focus('end')
          editor.chain().insertContent('<p></p>').run()
          editor.chain().focus().setImage({ src: result.url } as any).run()
        }
      } catch (err) {
        console.error('업로드 예외:', err)
        alert('이미지 업로드 중 오류가 발생했습니다.')
      }
    }
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

  function handleAlign(align: 'left' | 'center' | 'right') {
    if (!editor) return

    if (imageSelected) {
      const styleMap = {
        left: 'display: block; margin: 0 auto 0 0;',
        center: 'display: block; margin: 0 auto;',
        right: 'display: block; margin: 0 0 0 auto;',
      }
      editor.chain().updateAttributes('image', {
        style: styleMap[align],
      }).run()
    } else {
      editor.chain().focus().setTextAlign(align).run()
    }
  }

  // 현재 이미지의 정렬 상태 확인
  function isImageAligned(align: 'left' | 'center' | 'right') {
    if (!imageSelected) return editor!.isActive({ textAlign: align })
    const { node } = editor!.state.selection as any
    const style = (node?.attrs?.style as string) ?? ''
    if (align === 'center') return style.includes('margin: 0 auto;')
    if (align === 'right') return style.includes('margin: 0 0 0 auto')
    if (align === 'left') return style.includes('margin: 0 auto 0 0')
    return false
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
          active={isImageAligned('left')}
          onClick={() => handleAlign('left')}
        >
          좌
        </ToolButton>
        <ToolButton
          active={isImageAligned('center')}
          onClick={() => handleAlign('center')}
        >
          중
        </ToolButton>
        <ToolButton
          active={isImageAligned('right')}
          onClick={() => handleAlign('right')}
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

        {imageSelected && (
          <span className="ml-2 text-xs text-blue-500">
            이미지 선택됨
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
      onMouseDown={(e) => e.preventDefault()} // 포커스 이동 방지
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
