import DOMPurify from 'dompurify'

// Shows an article's HTML (fullContentHtml or previewContentHtml from Convex).
// The [&_tag]: classes style the tags inside the HTML, since we can't put
// classNames on them directly.
//
// DOMPurify strips anything that could run code (<script>, onclick=…, javascript: links)
// before dangerouslySetInnerHTML puts the HTML on the page. Never skip it: the HTML
// comes from the database, and the admin portal has no login yet.
export function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className={[
        'text-[1.0625rem] leading-relaxed text-foreground/85',
        // paragraphs
        '[&_p]:mb-5',
        // the first paragraph gets a large "drop cap" first letter
        '[&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mt-1 [&>p:first-of-type]:first-letter:mr-3 [&>p:first-of-type]:first-letter:font-serif [&>p:first-of-type]:first-letter:text-6xl [&>p:first-of-type]:first-letter:leading-[0.8] [&>p:first-of-type]:first-letter:text-blue-700',
        // section headings
        '[&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-normal [&_h2]:tracking-tight [&_h2]:text-foreground sm:[&_h2]:text-3xl',
        // pull quotes
        '[&_blockquote]:my-8 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-blue-700 [&_blockquote]:bg-card [&_blockquote]:px-6 [&_blockquote]:py-5 [&_blockquote]:font-serif [&_blockquote]:text-xl [&_blockquote]:leading-snug [&_blockquote]:text-blue-900 [&_blockquote]:italic sm:[&_blockquote]:text-2xl',
        // lists and links, for posts written in the admin editor
        '[&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1',
        '[&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-4',
        // smaller headings, highlights, code and dividers from the editor
        '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-foreground',
        '[&_mark]:rounded-sm [&_mark]:bg-amber-100 [&_mark]:px-0.5',
        '[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em]',
        '[&_pre]:mb-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-4',
        '[&_hr]:my-10 [&_hr]:border-border',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  )
}
