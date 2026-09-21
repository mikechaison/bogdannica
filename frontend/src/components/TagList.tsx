export function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">
          #{tag}
        </li>
      ))}
    </ul>
  )
}
