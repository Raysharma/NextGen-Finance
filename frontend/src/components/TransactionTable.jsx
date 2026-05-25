import React from 'react'

const incomingTypes = new Set(['deposit', 'transfer_in'])

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
}

function transactionMeta(transaction) {
  const type = String(transaction.transaction_type || '').toLowerCase()
  const incoming = incomingTypes.has(type)
  const label =
    type === 'transfer_in' ? 'Transfer in' : type === 'transfer_out' ? 'Transfer out' : type.charAt(0).toUpperCase() + type.slice(1)

  return {
    incoming,
    label,
    badgeClass: incoming
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
      : 'border-rose-400/20 bg-rose-400/10 text-rose-200',
    amountClass: incoming ? 'text-emerald-300' : 'text-rose-300',
    amountPrefix: incoming ? '+' : '-',
    directionLabel: incoming ? 'Incoming' : 'Outgoing',
    accountLabel:
      type === 'transfer_in'
        ? `From ${transaction.source_account_id || 'source account'}`
        : type === 'transfer_out'
          ? `To ${transaction.destination_account_id || 'destination account'}`
          : transaction.source_account_id
            ? `Acct ${transaction.source_account_id}`
            : transaction.destination_account_id
              ? `Acct ${transaction.destination_account_id}`
              : 'General ledger',
  }
}

function DirectionIcon({ incoming }) {
  return incoming ? (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="M10 3v12m0 0-5-5m5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="M10 17V5m0 0-5 5m5-5 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TableSkeletonRow() {
  return (
    <tr className="border-b border-white/5 last:border-b-0">
      <td className="px-4 py-4"><div className="h-4 w-28 rounded-full bg-white/10 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="h-4 w-44 rounded-full bg-white/10 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="h-4 w-36 rounded-full bg-white/10 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="h-4 w-24 rounded-full bg-white/10 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="h-4 w-32 rounded-full bg-white/10 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="h-4 w-28 rounded-full bg-white/10 animate-pulse" /></td>
    </tr>
  )
}

export default function TransactionTable({ transactions = [], loading = false, emptyState = 'No transactions yet.' }) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-2xl shadow-black/20">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="h-4 w-40 rounded-full bg-white/10 animate-pulse" />
          <div className="mt-2 h-3 w-64 rounded-full bg-white/10 animate-pulse" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableSkeletonRow key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!transactions.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
        {emptyState}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300 uppercase">Ledger</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Transaction history</h3>
        </div>
        <p className="text-sm text-slate-400">Clean, color-coded activity for deposits, withdrawals, and transfers.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Accounts</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((transaction) => {
              const meta = transactionMeta(transaction)
              return (
                <tr key={transaction.reference} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${meta.badgeClass}`}>
                      <DirectionIcon incoming={meta.incoming} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="max-w-md">
                      <p className="font-medium text-white">{transaction.description || 'No description'}</p>
                      <p className="mt-1 text-sm text-slate-400">{meta.directionLabel}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="text-sm text-slate-200">{meta.accountLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.source_account_id && transaction.destination_account_id ? 'Transfer ledger' : 'Single-account entry'}</p>
                  </td>
                  <td className={`px-4 py-4 align-top text-sm font-semibold ${meta.amountClass}`}>
                    {meta.amountPrefix}${formatAmount(transaction.amount)}
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-slate-300">{formatDate(transaction.created_at)}</td>
                  <td className="px-4 py-4 align-top text-sm text-slate-400">{transaction.reference}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}