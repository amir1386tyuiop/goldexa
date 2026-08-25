import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export function Button({ variant = 'primary', loading = false, children, className, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean; children: ReactNode }) {
  return <button {...props} disabled={disabled || loading} className={cn('btn px-4 py-2.5', { 'btn-primary': variant === 'primary', 'btn-secondary': variant === 'secondary', 'btn-outline': variant === 'outline', 'btn-ghost': variant === 'ghost', 'btn-danger': variant === 'danger' }, className)}>{loading && <Loader aria-hidden="true" className="ml-2 h-4 w-4 animate-spin" />}{children}</button>
}
