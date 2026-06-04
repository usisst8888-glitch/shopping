'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { useRef, useState, useCallback } from 'react'
import {
  Bold, Italic, Underline, Strikethrough, Eraser,
  Heading2, Heading3, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link2, Minus, Image as ImageIcon, Baseline, Highlighter, Images,
} from 'lucide-react'
import { ToolBtn, Divider, FontSizeDropdown, ColorDropdown } from './editor-ui'

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

// fontSize를 TextStyle에 커스텀 attribute로 추가
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },
})

// HTML에서 imagedelivery.net URL 추출
function extractImageUrls(html: string): string[] {
  const matches = html.match(/https:\/\/imagedelivery\.net\/[^"'\s)]+/g)
  return matches ? [...new Set(matches)] : []
}

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
  const prevImagesRef = useRef<string[]>(extractImageUrls(content))

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      CustomImage.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)

      // 이미지가 삭제되었는지 확인 → Cloudflare에서도 삭제
      const currentImages = extractImageUrls(html)
      const removedImages = prevImagesRef.current.filter(
        (url) => !currentImages.includes(url)
      )
      for (const url of removedImages) {
        fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }).catch(() => {})
      }
      prevImagesRef.current = currentImages
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

  // 모든 이미지에 정렬 적용
  function handleAlignAllImages(align: 'left' | 'center' | 'right') {
    const styleMap = {
      left: 'display: block; margin: 0 auto 0 0;',
      center: 'display: block; margin: 0 auto;',
      right: 'display: block; margin: 0 0 0 auto;',
    }

    const { doc, tr } = editor!.state
    const newTr = tr

    doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        newTr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          style: styleMap[align],
        })
      }
    })

    editor!.view.dispatch(newTr)
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

  function isImageAligned(align: 'left' | 'center' | 'right') {
    if (!imageSelected) return editor!.isActive({ textAlign: align })
    const { node } = editor!.state.selection as any
    const style = (node?.attrs?.style as string) ?? ''
    if (align === 'center') return style.includes('margin: 0 auto;')
    if (align === 'right') return style.includes('margin: 0 0 0 auto')
    if (align === 'left') return style.includes('margin: 0 auto 0 0')
    return false
  }

  function setFontSize(size: string) {
    editor!.chain().focus().setMark('textStyle', { fontSize: size }).run()
  }

  function applyTextColor(color: string) {
    editor!.chain().focus().setColor(color).run()
  }

  function applyHighlight(color: string) {
    editor!.chain().focus().toggleHighlight({ color }).run()
  }

  function clearFormat() {
    editor!.chain().focus().unsetAllMarks().run()
  }

  function handleLink() {
    const prev = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('링크 URL을 입력하세요', prev || 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
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
      <div className="flex flex-wrap items-center gap-0.5 bg-zinc-700 px-2 py-1.5">
        <FontSizeDropdown onPick={setFontSize} />
        <ColorDropdown
          title="글자색"
          icon={<Baseline size={16} />}
          current={editor.getAttributes('textStyle').color}
          onPick={applyTextColor}
        />
        <ColorDropdown
          title="배경색(형광펜)"
          icon={<Highlighter size={16} />}
          current={editor.getAttributes('highlight').color}
          onPick={applyHighlight}
        />

        <Divider />

        <ToolBtn title="굵게" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolBtn>
        <ToolBtn title="기울임" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolBtn>
        <ToolBtn title="밑줄" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={16} /></ToolBtn>
        <ToolBtn title="취소선" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolBtn>
        <ToolBtn title="서식 지우기" onClick={clearFormat}><Eraser size={16} /></ToolBtn>

        <Divider />

        <ToolBtn title="제목 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolBtn>
        <ToolBtn title="제목 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolBtn>

        <Divider />

        <ToolBtn title="왼쪽 정렬" active={isImageAligned('left')} onClick={() => handleAlign('left')}><AlignLeft size={16} /></ToolBtn>
        <ToolBtn title="가운데 정렬" active={isImageAligned('center')} onClick={() => handleAlign('center')}><AlignCenter size={16} /></ToolBtn>
        <ToolBtn title="오른쪽 정렬" active={isImageAligned('right')} onClick={() => handleAlign('right')}><AlignRight size={16} /></ToolBtn>

        <Divider />

        <ToolBtn title="글머리 목록" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></ToolBtn>
        <ToolBtn title="번호 목록" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolBtn>
        <ToolBtn title="링크" active={editor.isActive('link')} onClick={handleLink}><Link2 size={16} /></ToolBtn>
        <ToolBtn title="가로선" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></ToolBtn>

        <Divider />

        <ToolBtn title="이미지 삽입" onClick={() => fileInputRef.current?.click()}><ImageIcon size={16} /></ToolBtn>
        <ToolBtn title="모든 이미지 가운데 정렬" onClick={() => handleAlignAllImages('center')}><Images size={16} /></ToolBtn>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />

        {uploading && (
          <span className="ml-2 text-xs text-zinc-300">업로드 중...</span>
        )}

        {imageSelected && (
          <span className="ml-2 text-xs text-sky-300">이미지 선택됨</span>
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
