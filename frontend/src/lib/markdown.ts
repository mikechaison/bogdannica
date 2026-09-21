import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.use({
  gfm: true, // tables, strikethrough, task lists, autolinks
  breaks: true, // single newline = <br>, friendlier for casual writing
})

/**
 * Render Markdown (with inline HTML allowed) to sanitised HTML.
 * Legacy articles that were written as raw HTML still render, since Markdown passes HTML through.
 */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false })
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
}
