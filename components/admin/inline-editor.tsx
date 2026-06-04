'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { Bold, Italic, Underline, Eraser, Baseline, Highlighter } from 'lucide-react'
import { ToolBtn, Divider, FontSizeDropdown, ColorDropdown } from './editor-ui'

// fontSize를 TextStyle에 커스텀 attribute로 추가 (리치 에디터와 동일)
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

// 제목/짧은 텍스트용 컴팩트 리치 에디터 (글자 꾸미기 전용)
export function InlineEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        strike: false,
        link: false,
      }),
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // 비어있으면 빈 문자열로 (메인 렌더링의 기본값 폴백이 동작하도록)
      onChange(editor.getText().trim() === '' ? '' : editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'px-3 py-2 text-sm focus:outline-none [&_p]:my-0',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
  })

  if (!editor) return null

  return (
    <div className="rounded-lg border border-zinc-300">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg bg-zinc-700 px-2 py-1.5">
        <FontSizeDropdown dropUp onPick={(s) => editor.chain().focus().setMark('textStyle', { fontSize: s }).run()} />
        <ColorDropdown
          dropUp
          title="글자색"
          icon={<Baseline size={16} />}
          current={editor.getAttributes('textStyle').color}
          onPick={(c) => editor.chain().focus().setColor(c).run()}
        />
        <ColorDropdown
          dropUp
          title="배경색(형광펜)"
          icon={<Highlighter size={16} />}
          current={editor.getAttributes('highlight').color}
          onPick={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
        />

        <Divider />

        <ToolBtn title="굵게" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolBtn>
        <ToolBtn title="기울임" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolBtn>
        <ToolBtn title="밑줄" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={16} /></ToolBtn>
        <ToolBtn title="서식 지우기" onClick={() => editor.chain().focus().unsetAllMarks().run()}><Eraser size={16} /></ToolBtn>
      </div>

      {/* 입력 영역 */}
      <div className="rounded-b-lg bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
