import { products } from '@/data/mockData'

const categories = [
  { id: 'ring', name: 'انگشتر', icon: '💍', count: 42 },
  { id: 'necklace', name: 'گردنبند', icon: '📿', count: 28 },
  { id: 'bracelet', name: 'دستبند', icon: '⌚', count: 35 },
  { id: 'earring', name: 'گوشواره', icon: '✨', count: 21 },
  { id: 'pendant', name: 'آویز', icon: '🔸', count: 18 },
  { id: 'custom', name: 'سفارشی', icon: '🎨', count: 12 },
]

export function CategoryGrid() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-navy-900 mb-2">
            دسته‌بندی‌های محبوب
          </h2>
          <p className="text-muted-foreground">زیورآلات را بر اساس سلیقه خود انتخاب کنید</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => {
            const count = products.filter((p) => p.category === category.id).length
            return (
              <div
                key={category.id}
                className="card p-5 text-center cursor-pointer hover:border-gold-400 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-bold text-sm mb-1">{category.name}</h3>
                <p className="text-xs text-muted-foreground">{count} محصول</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
