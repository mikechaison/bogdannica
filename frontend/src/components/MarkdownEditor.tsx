import { useMemo, useRef, useState } from 'react'
import { renderMarkdown } from '../lib/markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  minHeightClass?: string
}

type InlineAction = { kind: 'inline'; before: string; after: string; sample: string }
type LineAction = { kind: 'line'; prefix: string; sample: string; numbered?: boolean }
type Action = InlineAction | LineAction

interface ToolbarButton {
  label: string
  title: string
  className?: string
  action: Action
}

const TOOLBAR: ToolbarButton[] = [
  { label: 'Ж', title: 'Жирний (Ctrl+B)', className: 'font-bold', action: { kind: 'inline', before: '**', after: '**', sample: 'жирний текст' } },
  { label: 'К', title: 'Курсив (Ctrl+I)', className: 'italic', action: { kind: 'inline', before: '_', after: '_', sample: 'курсив' } },
  { label: 'S', title: 'Закреслений', className: 'line-through', action: { kind: 'inline', before: '~~', after: '~~', sample: 'закреслений' } },
  { label: 'H2', title: 'Заголовок', action: { kind: 'line', prefix: '## ', sample: 'Заголовок' } },
  { label: 'H3', title: 'Підзаголовок', action: { kind: 'line', prefix: '### ', sample: 'Підзаголовок' } },
  { label: '"', title: 'Цитата', action: { kind: 'line', prefix: '> ', sample: 'цитата' } },
  { label: '•', title: 'Маркований список', action: { kind: 'line', prefix: '- ', sample: 'пункт' } },
  { label: '1.', title: 'Нумерований список', action: { kind: 'line', prefix: '1. ', sample: 'пункт', numbered: true } },
  { label: '<>', title: 'Код', className: 'font-mono', action: { kind: 'inline', before: '`', after: '`', sample: 'код' } },
  { label: '🔗', title: 'Посилання', action: { kind: 'inline', before: '[', after: '](https://)', sample: 'текст посилання' } },
  { label: '🖼', title: 'Зображення', action: { kind: 'inline', before: '![', after: '](https://)', sample: 'опис' } },
]

const CHEATSHEET = [
  ['**жирний**', 'жирний'],
  ['_курсив_', 'курсив'],
  ['## Заголовок', 'заголовок'],
  ['- пункт', 'список'],
  ['[текст](https://…)', 'посилання'],
  ['![опис](https://…)', 'зображення'],
] as const

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  required,
  minHeightClass = 'min-h-72',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const preview = useMemo(() => (tab === 'preview' ? renderMarkdown(value) : ''), [tab, value])

  const applyAction = (action: Action) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)

    let next: string
    let selStart: number
    let selEnd: number

    if (action.kind === 'inline') {
      const text = selected || action.sample
      next = value.slice(0, start) + action.before + text + action.after + value.slice(end)
      selStart = start + action.before.length
      selEnd = selStart + text.length
    } else {
      // Expand the selection to whole lines and prefix each of them.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEndIdx = value.indexOf('\n', end)
      const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
      const block = value.slice(lineStart, lineEnd) || action.sample
      const lines = block.split('\n')
      const prefixed = lines
        .map((line, i) => (action.numbered ? `${i + 1}. ` : action.prefix) + line)
        .join('\n')
      next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
      selStart = lineStart
      selEnd = lineStart + prefixed.length
    }

    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(selStart, selEnd)
    })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (key === 'b') {
      e.preventDefault()
      applyAction(TOOLBAR[0].action)
    } else if (key === 'i') {
      e.preventDefault()
      applyAction(TOOLBAR[1].action)
    }
  }

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium ${active ? 'border-b-2 border-red-600 text-red-700' : 'text-stone-500 hover:text-stone-800'}`

  return (
    <div className="overflow-hidden rounded-lg border border-stone-300 bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-2">
        <div className="flex">
          <button type="button" className={tabClass(tab === 'write')} onClick={() => setTab('write')}>
            Редагувати
          </button>
          <button type="button" className={tabClass(tab === 'preview')} onClick={() => setTab('preview')}>
            Перегляд
          </button>
        </div>
        {tab === 'write' && (
          <div className="flex flex-wrap gap-0.5 py-1" role="toolbar" aria-label="Форматування">
            {TOOLBAR.map((btn) => (
              <button
                key={btn.title}
                type="button"
                title={btn.title}
                aria-label={btn.title}
                onMouseDown={(e) => e.preventDefault()} // keep textarea selection
                onClick={() => applyAction(btn.action)}
                className={`min-w-8 rounded px-1.5 py-1 text-sm text-stone-700 hover:bg-stone-200 ${btn.className ?? ''}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required={required}
          className={`block w-full resize-y px-3 py-2 font-mono text-sm leading-6 outline-none ${minHeightClass}`}
        />
      ) : (
        <div className={`px-4 py-3 ${minHeightClass}`}>
          {value.trim() ? (
            <div className="article-content" dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <p className="text-sm text-stone-400">Нічого переглядати — текст порожній.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-500">
        {CHEATSHEET.map(([syntax, meaning]) => (
          <span key={syntax}>
            <code className="rounded bg-stone-200 px-1">{syntax}</code> {meaning}
          </span>
        ))}
      </div>
    </div>
  )
}
