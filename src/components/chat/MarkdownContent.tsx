import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

const schema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes || {}),
    code: [...(defaultSchema.attributes?.code || []), ['className']],
    span: [['className']],
  },
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      className="prose prose-stone max-w-none text-base leading-relaxed prose-headings:text-brand-bark prose-strong:text-brand-bark prose-code:bg-brand-sand/60 prose-code:text-brand-bark"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeSlug, rehypeAutolinkHeadings]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const codeText = String(children).trim()
          if (inline) {
            return (
              <code className="rounded-md bg-brand-sand/60 px-1.5 py-0.5 text-[0.95em] text-brand-bark" {...props}>
                {codeText}
              </code>
            )
          }
          return (
            <pre className="rounded-2xl bg-brand-charcoal/90 p-4 text-brand-ivory shadow-inner" {...props}>
              <code>{codeText}</code>
            </pre>
          )
        },
        table({ children }) {
          return <table className="w-full overflow-hidden rounded-2xl border border-brand-sand/60 text-sm">{children}</table>
        },
        th({ children }) {
          return <th className="bg-brand-sand/40 px-4 py-2 text-left font-semibold text-brand-bark">{children}</th>
        },
        td({ children }) {
          return <td className="px-4 py-2 text-brand-bark/90">{children}</td>
        },
      }}
    >
      {content || '…'}
    </ReactMarkdown>
  )
}
