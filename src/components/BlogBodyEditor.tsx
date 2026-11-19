import { getHTMLFromFragment, type Editor } from '@tiptap/core'
import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useEditor } from '@tiptap/react'
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
      Placeholder.configure({ placeholder: 'Start writing your post…' }),
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
        class: 'min-h-80 px-4 py-3 outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(readBody(editor)),
    onBlur: () => onBlur?.(),
  })

  return (
    <RichTextEditor
      editor={editor}
      className={cn(invalid && 'border-destructive ring-3 ring-destructive/20')}
    >
      <RichTextEditor.Toolbar sticky>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo />
          <RichTextEditor.Redo />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.Highlight />
          <RichTextEditor.ClearFormatting />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Blockquote />
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
          <RichTextEditor.Hr />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.AlignLeft />
          <RichTextEditor.AlignCenter />
          <RichTextEditor.AlignRight />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content />
      <RichTextEditor.Footer showWordCount />
    </RichTextEditor>
  )
}
