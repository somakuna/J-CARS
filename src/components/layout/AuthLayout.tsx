import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

/** Jednostavan centrirani okvir za prijavu i promjenu lozinke. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.svg" alt="J-CARS" className="size-20 rounded-2xl shadow-sm" width={80} height={80} />
          <p className="mt-3 text-sm text-muted">J-CARS System</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  )
}
