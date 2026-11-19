import { getHTMLFromFragment, type Editor } from '@tiptap/core'
import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useEditor } from '@tiptap/react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import StarterKit from '@tiptap/starter-kit'
import { Link, RichTextEditor } from '@/components/editor'
import '@/components/editor/style.css'
import { cn } from '@/lib/utils'
import type { BlogBodyValue } from '@/lib/blogFormSchema'

// How much of a paid post readers see before the paywall: whole blocks
// (paragraphs, headings…) from the top until we reach this many words.
const PREVIEW_WORDS = 80

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

// Reads everything the form needs out of the editor.
function readBody(editor: Editor): BlogBodyValue {
  const wordCount = editor.isEmpty ? 0 : countWords(editor.getText())

  // Never show more than a quarter of the post as the free preview.
  const previewTarget = Math.min(PREVIEW_WORDS, Math.ceil(wordCount / 4))
  const previewBlocks: ProseMirrorNode[] = []
  let previewWords = 0
  editor.state.doc.forEach((block) => {
    if (previewBlocks.length > 0 && previewWords >= previewTarget) return
    previewBlocks.push(block)
    previewWords += countWords(block.textContent)
  })

  return {
    html: editor.isEmpty ? '' : editor.getHTML(),
    previewHtml: getHTMLFromFragment(Fragment.from(previewBlocks), editor.schema),
    wordCount,
  }
}

interface BlogBodyEditorProps {
  id?: string
  onChange: (body: BlogBodyValue) => void
  onBlur?: () => void
  invalid?: boolean
  describedBy?: string
}

// The blog body input: the editorcn rich text editor (src/components/editor),
// set up with the formatting a blog post needs.
export function BlogBodyEditor({ id, onChange, onBlur, invalid, describedBy }: BlogBodyEditorProps) {
  const editor = useEditor({
    extensions: [
      // StarterKit = paragraphs, headings, bold, italic, lists, quotes, undo… .
      // Its own link is off because editorcn ships a Link with a Mod-K shortcut.
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder:
          'Begin drafting the article here. Use headings, quotes, code blocks and lists to structure it…',
      }),
      CharacterCount, // powers the word count in the footer
    ],
    editorProps: {
      attributes: {
        // Lets the <label> and error message point at the editable area.
        ...(id ? { id } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-invalid': invalid ? 'true' : 'false',
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        class: 'min-h-80 px-6 py-5 text-[0.95rem] leading-relaxed outline-none sm:px-10 sm:py-8',
      },
    },
    onUpdate: ({ editor }) => onChange(readBody(editor)),
    onBlur: () => onBlur?.(),
  })

  // Zen mode: the editor fills the whole screen so nothing else distracts. Esc leaves it.
  const [zen, setZen] = useState(false)
  useEffect(() => {
    if (!zen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [zen])

  return (
    <div className={cn(zen && 'fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-8')}>
      <div className={cn(zen && 'mx-auto max-w-3xl')}>
        <RichTextEditor
          editor={editor}
          className={cn(
            'rounded-xl bg-background',
            invalid && 'border-destructive ring-3 ring-destructive/20',
            zen && 'min-h-[calc(100dvh-4rem)]',
          )}
        >
          <RichTextEditor.Toolbar sticky className="flex-wrap justify-center">
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.Highlight />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Blockquote />
              <RichTextEditor.Code />
              <RichTextEditor.CodeBlock />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
              <RichTextEditor.Link />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Control
                active={zen}
                aria-label={zen ? 'Leave Zen mode' : 'Zen mode: write full screen'}
                title={zen ? 'Leave Zen mode (Esc)' : 'Zen mode: write full screen'}
                onClick={() => setZen((on) => !on)}
                className="w-auto gap-1 px-2 text-xs"
              >
                {zen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                Zen
              </RichTextEditor.Control>
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
        </RichTextEditor>
      </div>
    </div>
  )
}
