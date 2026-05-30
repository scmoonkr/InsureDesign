// Relative time formatter used by public post / category / tag pages.
// Under a day → 초전 / 분전 / 시간전.  Otherwise → yyyy-MM-dd.
export function formatRelativeDate(d?: string | null): string {
  if (!d) return ''
  const ts = new Date(d).getTime()
  if (Number.isNaN(ts)) return ''

  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))

  if (diffSec < 60) return `${diffSec}초전`

  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}분전`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간전`

  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
