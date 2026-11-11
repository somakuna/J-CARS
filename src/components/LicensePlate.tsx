import { cn } from '@/lib/cn'

/** Registracijska oznaka u obliku pločice. */
export function LicensePlate({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center overflow-hidden rounded-md border border-fg/25 bg-surface text-xs font-semibold tracking-wider whitespace-nowrap',
        className,
      )}
    >
      <span className="self-stretch bg-blue-700 px-1 py-0.5 text-[9px] leading-[1.6] font-bold text-white" aria-hidden="true">
        HR
      </span>
      <span className="px-1.5 py-0.5">{value}</span>
    </span>
  )
}
