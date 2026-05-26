import clsx from 'clsx'

type BadgeVariant = 'stroke' | 'match' | 'skins' | 'nassau' | 'success' | 'warning' | 'info' | 'muted'

const variants: Record<BadgeVariant, string> = {
  stroke:  'bg-green-50 text-green-800',
  match:   'bg-blue-50 text-blue-800',
  skins:   'bg-amber-50 text-amber-800',
  nassau:  'bg-purple-50 text-purple-800',
  success: 'bg-green-50 text-green-800',
  warning: 'bg-amber-50 text-amber-800',
  info:    'bg-blue-50 text-blue-800',
  muted:   'bg-gray-100 text-gray-500',
}

export function Badge({ children, variant = 'muted' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={clsx('text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap', variants[variant])}>
      {children}
    </span>
  )
}

export function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={clsx(
      'text-[11px] px-2 py-1 rounded border',
      active
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-gray-50 border-gray-200 text-gray-500'
    )}>
      {children}
    </span>
  )
}
