import { Link } from 'react-router-dom'
import { ArrowRight, SearchX } from 'lucide-react'

export function NotFoundPage() {
  return (
    <section className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="card max-w-lg p-10 text-center">
        <SearchX aria-hidden="true" className="mx-auto h-12 w-12 text-amber-700" />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">404</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">این صفحه پیدا نشد</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">آدرس واردشده معتبر نیست یا این محتوا دیگر در دسترس نیست.</p>
        <Link to="/home" className="btn btn-primary mt-6 inline-flex items-center gap-2">
          بازگشت به خانه
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
