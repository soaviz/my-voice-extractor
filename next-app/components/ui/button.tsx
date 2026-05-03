'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer'

const variants = {
  default:
    'bg-[var(--accent)] text-white hover:bg-[#7c3aed] active:scale-[0.98]',
  outline:
    'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--accent-soft)] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] active:scale-[0.98]',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading, children, className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
