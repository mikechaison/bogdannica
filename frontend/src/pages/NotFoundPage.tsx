import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <p className="text-6xl font-extrabold text-red-400">404</p>
      <h1 className="text-2xl font-bold">Сторінку не знайдено</h1>
      <p className="text-stone-600">Такого мема ще не існує. Можливо, саме ви його створите?</p>
      <Link to="/" className="inline-block rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">
        На головну
      </Link>
    </div>
  )
}
