import React from 'react'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function DashboardLayout({
  user,
  title,
  description,
  activeSection,
  sections = [],
  onNavigate,
  onLogout,
  statusLabel,
  statusTone = 'neutral',
  children,
}) {
  const firstName = user?.full_name?.split(' ')?.[0] || 'Customer'

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(45,212,191,0.14),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#061120_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-white/10 bg-slate-950/80 px-6 py-7 backdrop-blur xl:flex xl:flex-col">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-300 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              NG
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.22em] text-cyan-300 uppercase">NextGen Finance</p>
              <p className="text-sm text-slate-400">Modern digital banking</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Signed in</p>
            <p className="mt-2 text-2xl font-semibold text-white">{firstName}</p>
            <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-200">{user?.role || 'customer'}</span>
              {statusLabel ? (
                <span
                  className={cx(
                    'rounded-full px-3 py-1 font-medium',
                    statusTone === 'success' && 'bg-emerald-400/10 text-emerald-200',
                    statusTone === 'warning' && 'bg-amber-400/10 text-amber-200',
                    statusTone === 'danger' && 'bg-rose-400/10 text-rose-200',
                    statusTone === 'neutral' && 'bg-white/10 text-slate-200',
                  )}
                >
                  {statusLabel}
                </span>
              ) : null}
            </div>
          </div>

          <nav className="mt-8 flex-1 space-y-2">
            {sections.map((section) => {
              const active = section.id === activeSection
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onNavigate(section.id)}
                  className={cx(
                    'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-400/70',
                    active
                      ? 'border-cyan-400/30 bg-cyan-400/12 text-white shadow-lg shadow-cyan-500/10'
                      : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <span>{section.label}</span>
                  <span className="text-xs text-slate-400">{active ? 'Open' : ''}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">Platform status</p>
            <p className="mt-2 leading-6">
              Use this dashboard for account management, payments, statements, and admin controls without leaving the main workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/60"
          >
            Log out
          </button>
        </aside>

        <div className="flex min-h-screen w-full flex-1 flex-col xl:pl-80">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 px-4 py-4 backdrop-blur xl:hidden sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300 uppercase">NextGen Finance</p>
                <p className="text-sm text-slate-400">{firstName}</p>
              </div>
              {statusLabel ? <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">{statusLabel}</span> : null}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onNavigate(section.id)}
                  className={cx(
                    'shrink-0 rounded-full border px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-400/70',
                    section.id === activeSection
                      ? 'border-cyan-400/30 bg-cyan-400/12 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300',
                  )}
                >
                  {section.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onLogout}
                className="shrink-0 rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100"
              >
                Log out
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300 uppercase">Dashboard</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">{description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">Responsive sidebar</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">Fintech-grade layout</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">Fast navigation</span>
                </div>
              </div>
            </section>

            {children}
          </main>
        </div>
      </div>
    </div>
  )
}