// Turns an article `body` string into headings, quotes and paragraphs.
// Format (see convex/seedData.ts):
//   blocks are separated by a blank line
//   "## Heading"  -> a section heading
//   "> Quote"     -> a pull quote
//   anything else -> a paragraph
export function ArticleBody({ body }: { body: string }) {
  const blocks = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)

  return (
    <div className="text-[1.0625rem] leading-relaxed text-foreground/85">
      {blocks.map((block, index) => {
        if (block.startsWith('## ')) {
          return (
            <h2
              key={index}
              className="mt-10 mb-4 font-serif text-2xl font-normal tracking-tight text-foreground sm:text-3xl"
            >
              {block.slice(3)}
            </h2>
          )
        }

        if (block.startsWith('> ')) {
          return (
            <blockquote
              key={index}
              className="my-8 rounded-r-xl border-l-4 border-blue-700 bg-card px-6 py-5 font-serif text-xl leading-snug text-blue-900 italic sm:text-2xl"
            >
              {block.slice(2)}
            </blockquote>
          )
        }

        return (
          <p
            key={index}
            className={
              index === 0
                ? // The first paragraph gets a large "drop cap" first letter.
                  'mb-5 first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.8] first-letter:text-blue-700'
                : 'mb-5'
            }
          >
            {block}
          </p>
        )
      })}
    </div>
  )
}
