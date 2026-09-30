// shadcn/ui Button pattern, shared by the web app and extension.
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const variants = cva('inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:pointer-events-none disabled:opacity-50', {
  variants: { variant: { default: 'bg-teal-800 text-white hover:bg-teal-900', outline: 'border border-stone-300 bg-white hover:bg-stone-50 text-stone-800', ghost: 'text-stone-600 hover:bg-stone-100' }, size: { default: 'px-4 py-3', sm: 'px-3 py-2' } }, defaultVariants: { variant: 'default', size: 'default' },
});
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(variants({ variant, size, className }))} {...props} />;
}
export function Logo() { return <span className="flex items-center gap-2.5 font-semibold tracking-tight text-xl"><span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-800 text-white"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m8 10 3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>My View</span>; }
