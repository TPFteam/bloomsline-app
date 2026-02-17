import { useMemo } from 'react'
import { fmtDate, getMonday, type Anchor, type AnchorLog, type AnchorStats } from './shared'

type Input = {
  anchors: Anchor[]
  logs: AnchorLog[]
}

export default function useSeedsData({ anchors, logs }: Input) {
  const today = useMemo(() => fmtDate(new Date()), [])

  const weekDays = useMemo(() => {
    const mon = getMonday(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      return fmtDate(d)
    })
  }, [])

  const monthDays = useMemo(() => {
    const days: string[] = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      days.push(fmtDate(d))
    }
    return days
  }, [])

  // anchorId → dateStr → count
  const historyMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const log of logs) {
      if (!map[log.anchor_id]) map[log.anchor_id] = {}
      map[log.anchor_id][log.log_date] = (map[log.anchor_id][log.log_date] || 0) + 1
    }
    return map
  }, [logs])

  // Per-day breakdown: grow count vs letgo count
  const dayBreakdown = useMemo(() => {
    const anchorTypeMap: Record<string, 'grow' | 'letgo'> = {}
    for (const a of anchors) anchorTypeMap[a.id] = a.type

    const breakdown: Record<string, { grow: number; letgo: number }> = {}
    for (const log of logs) {
      if (!breakdown[log.log_date]) breakdown[log.log_date] = { grow: 0, letgo: 0 }
      const type = anchorTypeMap[log.anchor_id] || 'grow'
      breakdown[log.log_date][type]++
    }
    return breakdown
  }, [logs, anchors])

  // Per-anchor stats
  const anchorStats = useMemo(() => {
    const stats: Record<string, AnchorStats> = {}

    for (const anchor of anchors) {
      const dateCounts = historyMap[anchor.id] || {}
      const allDates = Object.keys(dateCounts).sort()

      let total = 0
      for (const c of Object.values(dateCounts)) total += c

      // Current streak
      let currentStreak = 0
      const d = new Date()
      if (dateCounts[fmtDate(d)]) { currentStreak = 1; d.setDate(d.getDate() - 1) }
      else { d.setDate(d.getDate() - 1) }
      while (dateCounts[fmtDate(d)]) { currentStreak++; d.setDate(d.getDate() - 1) }

      // Best streak
      let bestStreak = 0
      let run = 0
      const sortedDates = [...new Set(allDates)].sort()
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) { run = 1 }
        else {
          const prev = new Date(sortedDates[i - 1])
          const curr = new Date(sortedDates[i])
          if (curr.getTime() - prev.getTime() <= 86400000 + 3600000) { run++ }
          else { run = 1 }
        }
        if (run > bestStreak) bestStreak = run
      }

      // Last 30 days
      let last30 = 0
      const now = new Date()
      for (let i = 0; i < 30; i++) {
        const dd = new Date(now)
        dd.setDate(now.getDate() - i)
        if (dateCounts[fmtDate(dd)]) last30++
      }

      // Week total
      let weekTotal = 0
      for (const wd of weekDays) { weekTotal += dateCounts[wd] || 0 }

      stats[anchor.id] = { total, currentStreak, bestStreak, last30, weekTotal }
    }
    return stats
  }, [anchors, historyMap, weekDays])

  // Most consistent seed
  const mostConsistent = useMemo(() => {
    let best: Anchor | null = null
    let bestScore = 0
    for (const a of anchors) {
      const s = anchorStats[a.id]
      if (s && s.last30 > bestScore) { bestScore = s.last30; best = a }
    }
    return best
  }, [anchors, anchorStats])

  const growAnchors = useMemo(() => anchors.filter(a => a.type === 'grow'), [anchors])
  const letgoAnchors = useMemo(() => anchors.filter(a => a.type === 'letgo'), [anchors])

  // Seeds logged on a specific day
  function seedsForDay(dateStr: string) {
    const result: { anchor: Anchor; count: number }[] = []
    for (const a of anchors) {
      const count = historyMap[a.id]?.[dateStr] || 0
      if (count > 0) result.push({ anchor: a, count })
    }
    return result
  }

  return {
    today,
    weekDays,
    monthDays,
    historyMap,
    dayBreakdown,
    anchorStats,
    mostConsistent,
    growAnchors,
    letgoAnchors,
    seedsForDay,
  }
}
