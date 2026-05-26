import { AVATAR_COLORS } from '@/types'
import clsx from 'clsx'

interface AvatarProps {
  initials: string
  colorIndex?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-6 h-6 text-[9px]', md: 'w-7 h-7 text-[10px]', lg: 'w-9 h-9 text-[12px]' }

export function Avatar({ initials, colorIndex = 0, size = 'md', className }: AvatarProps) {
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  return (
    <div
      className={clsx('rounded-full flex items-center justify-center font-medium flex-shrink-0', sizes[size], className)}
      style={{ background: color.bg, color: color.text }}
    >
      {initials}
    </div>
  )
}

export function AvatarStack({ items }: { items: { initials: string; colorIndex: number }[] }) {
  return (
    <div className="flex">
      {items.map((item, i) => (
        <Avatar
          key={i}
          initials={item.initials}
          colorIndex={item.colorIndex}
          size="sm"
          className={i > 0 ? '-ml-1.5 ring-2 ring-white' : ''}
        />
      ))}
    </div>
  )
}
