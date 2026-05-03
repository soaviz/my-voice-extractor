'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full h-11 px-4 rounded-[calc(var(--radius)-2px)] bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-dim)] transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Input.displayName = 'Input'
