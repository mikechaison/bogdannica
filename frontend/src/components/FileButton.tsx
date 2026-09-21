import { useId, type ChangeEvent, type ReactNode } from 'react'

interface FileButtonProps {
  children: ReactNode
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  accept?: string
  multiple?: boolean
  /** Text shown next to the button, e.g. the selected file name. */
  hint?: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md'
}

/** A styled replacement for the native "Choose file" control. */
export function FileButton({ children, onChange, accept, multiple, hint, variant = 'secondary', size = 'md' }: FileButtonProps) {
  const id = useId()
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  const variantClass =
    variant === 'primary'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'border border-stone-300 bg-white text-stone-700 hover:border-red-400 hover:text-red-700'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input id={id} type="file" accept={accept} multiple={multiple} onChange={onChange} className="sr-only" />
      <label
        htmlFor={id}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg font-semibold shadow-sm transition focus-within:ring-2 focus-within:ring-red-200 ${sizeClass} ${variantClass}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
        {children}
      </label>
      {hint && <span className="text-sm text-stone-500">{hint}</span>}
    </div>
  )
}
