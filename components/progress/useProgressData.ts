import { useMemo } from 'react'
import {
  fmtDate,
  getMonday,
  RITUAL_MOOD_EMOJIS,
  MOMENT_TYPE_META,
  type MomentRow,
  type CompletionRow,
  type MemberRitualRow,
  type AnchorRow,
  type AnchorLogRow,
} from './shared'

type Input = {
  moments: MomentRow[]
  completions: CompletionRow[]
  memberRituals: MemberRitualRow[]
  anchors: AnchorRow[]
  anchorLogs: AnchorLogRow[]
}

export default function useProgressData({
  moments,
  completions,
  memberRituals,
  anchors,
  anchorLogs,
}: Input) {
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

  // Ritual completions by date
  const ritualCompletionsByDate = useMemo(() => {
    const map: Record<string, CompletionRow[]> = {}
    for (const c of completions) {
      if (!c.completed) continue
      if (!map[c.completion_date]) map[c.completion_date] = []
      map[c.completion_date].push(c)
    }
    return map
  }, [completions])

  // Ritual completion map: ritual_id → Set<dateStr>
  const ritualCompletionMap = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const c of completions) {
      if (!c.completed) continue
      if (!map[c.ritual_id]) map[c.ritual_id] = new Set()
      map[c.ritual_id].add(c.completion_date)
    }
    return map
  }, [completions])

  // Per-ritual per-day detail
  const ritualDayDetail = useMemo(() => {
    const map: Record<string, Record<string, { duration: number | null }>> = {}
    for (const c of completions) {
      if (!c.completed) continue
      if (!map[c.ritual_id]) map[c.ritual_id] = {}
      map[c.ritual_id][c.completion_date] = { duration: c.duration_minutes }
    }
    return map
  }, [completions])

  // Anchor logs by date: anchorId → dateStr → count
  const anchorLogMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const log of anchorLogs) {
      if (!map[log.anchor_id]) map[log.anchor_id] = {}
      map[log.anchor_id][log.log_date] = (map[log.anchor_id][log.log_date] || 0) + 1
    }
    return map
  }, [anchorLogs])

  // Anchor logs by date (flat): dateStr → Set<anchorId>
  const anchorLogsByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const log of anchorLogs) {
      if (!map[log.log_date]) map[log.log_date] = new Set()
      map[log.log_date].add(log.anchor_id)
    }
    return map
  }, [anchorLogs])

  // Moments by date
  const momentsByDate = useMemo(() => {
    const map: Record<string, MomentRow[]> = {}
    for (const m of moments) {
      const dateStr = m.created_at.split('T')[0]
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(m)
    }
    return map
  }, [moments])

  // Ritual stats per ritual
  const ritualStats = useMemo(() => {
    const stats: Record<string, { currentStreak: number; daysCompleted: number }> = {}
    for (const r of memberRituals) {
      const dates = ritualCompletionMap[r.ritual_id] || new Set<string>()
      let currentStreak = 0
      const d = new Date()
      if (dates.has(fmtDate(d))) { currentStreak = 1; d.setDate(d.getDate() - 1) }
      else { d.setDate(d.getDate() - 1) }
      while (dates.has(fmtDate(d))) { currentStreak++; d.setDate(d.getDate() - 1) }
      const daysCompleted = monthDays.filter(day => dates.has(day)).length
      stats[r.ritual_id] = { currentStreak, daysCompleted }
    }
    return stats
  }, [memberRituals, ritualCompletionMap, monthDays])

  // Anchor stats per anchor
  const anchorStats = useMemo(() => {
    const stats: Record<string, { currentStreak: number; last30: number }> = {}
    for (const anchor of anchors) {
      const dateCounts = anchorLogMap[anchor.id] || {}
      let currentStreak = 0
      const d = new Date()
      if (dateCounts[fmtDate(d)]) { currentStreak = 1; d.setDate(d.getDate() - 1) }
      else { d.setDate(d.getDate() - 1) }
      while (dateCounts[fmtDate(d)]) { currentStreak++; d.setDate(d.getDate() - 1) }
      let last30 = 0
      const now = new Date()
      for (let i = 0; i < 30; i++) {
        const dd = new Date(now)
        dd.setDate(now.getDate() - i)
        if (dateCounts[fmtDate(dd)]) last30++
      }
      stats[anchor.id] = { currentStreak, last30 }
    }
    return stats
  }, [anchors, anchorLogMap])

  // Week data
  const weekData = useMemo(() => {
    let ritualDays = 0
    let seedDays = 0
    let momentCount = 0
    for (const dayStr of weekDays) {
      if ((ritualCompletionsByDate[dayStr] || []).length > 0) ritualDays++
      if (anchorLogsByDate[dayStr]?.size) seedDays++
      momentCount += (momentsByDate[dayStr] || []).length
    }
    return { ritualDays, seedDays, momentCount }
  }, [weekDays, ritualCompletionsByDate, anchorLogsByDate, momentsByDate])

  // Ritual moods
  const ritualMoodCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of completions) {
      if (c.completed && c.mood) {
        counts[c.mood] = (counts[c.mood] || 0) + 1
      }
    }
    return counts
  }, [completions])

  const totalRitualMoods = useMemo(
    () => Object.values(ritualMoodCounts).reduce((a, b) => a + b, 0),
    [ritualMoodCounts],
  )

  const dominantRitualMood = useMemo(() => {
    let best = ''
    let bestCount = 0
    for (const [mood, count] of Object.entries(ritualMoodCounts)) {
      if (count > bestCount) { best = mood; bestCount = count }
    }
    return best
  }, [ritualMoodCounts])

  // Moment mood tags
  const momentMoodCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of moments) {
      for (const mood of (m.moods || [])) {
        counts[mood] = (counts[mood] || 0) + 1
      }
    }
    return counts
  }, [moments])

  const topMomentMoods = useMemo(() => {
    return Object.entries(momentMoodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [momentMoodCounts])

  // Moment type counts
  const momentTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of moments) {
      counts[m.type] = (counts[m.type] || 0) + 1
    }
    return counts
  }, [moments])

  // 30-day combined
  const dayActivityCounts = useMemo(() => {
    const map: Record<string, { rituals: number; seeds: number; moments: number }> = {}
    for (const dayStr of monthDays) {
      map[dayStr] = {
        rituals: (ritualCompletionsByDate[dayStr] || []).length,
        seeds: anchorLogsByDate[dayStr]?.size || 0,
        moments: (momentsByDate[dayStr] || []).length,
      }
    }
    return map
  }, [monthDays, ritualCompletionsByDate, anchorLogsByDate, momentsByDate])

  // ── Narratives ──────────────────────────────────────────

  function getWeekNarrative(): string {
    const { ritualDays, seedDays, momentCount } = weekData
    const total = ritualDays + seedDays + momentCount
    if (total === 0) {
      return "A quiet week so far. No pressure \u2014 when you're ready, even one small step can shift the day."
    }
    const parts: string[] = []
    if (momentCount > 0) parts.push(`captured ${momentCount} moment${momentCount !== 1 ? 's' : ''}`)
    if (ritualDays > 0) parts.push(`practiced rituals on ${ritualDays} day${ritualDays !== 1 ? 's' : ''}`)
    if (seedDays > 0) parts.push(`logged your seeds ${seedDays} time${seedDays !== 1 ? 's' : ''}`)
    return `This week you ${parts.join(', ')}.`
  }

  function getMoodNarrative(): string {
    if (totalRitualMoods === 0 && topMomentMoods.length === 0) return ''
    const moodMap: Record<string, string> = {
      great:     "You've been feeling wonderful lately. Whatever you're doing, it's working.",
      good:      "Most of your check-ins feel steady and grounded. Your practices are nourishing you well.",
      okay:      "You've been in an okay place. Showing up even when it's just 'okay' takes quiet strength.",
      low:       "It's been a heavier stretch. But you're still here, still checking in. That matters.",
      difficult: "Things have been hard lately. The fact that you keep going takes real courage.",
    }
    if (dominantRitualMood && moodMap[dominantRitualMood]) return moodMap[dominantRitualMood]
    if (topMomentMoods.length > 0) {
      const top = topMomentMoods[0][0]
      return `Your moments have been colored with ${top}. That's a feeling worth honoring.`
    }
    return ''
  }

  function getMomentsNarrative(): string {
    if (moments.length === 0) return "You haven't captured any moments yet this month. When something moves you, it's worth holding onto."
    const parts: string[] = []
    for (const [type, meta] of Object.entries(MOMENT_TYPE_META)) {
      const count = momentTypeCounts[type] || 0
      if (count > 0) parts.push(`${count} ${meta.label.toLowerCase()}`)
    }
    return `You've captured ${moments.length} moment${moments.length !== 1 ? 's' : ''} this month${parts.length > 0 ? ` \u2014 ${parts.join(', ')}` : ''}.`
  }

  return {
    today,
    weekDays,
    monthDays,
    ritualCompletionsByDate,
    ritualCompletionMap,
    ritualDayDetail,
    anchorLogMap,
    anchorLogsByDate,
    momentsByDate,
    ritualStats,
    anchorStats,
    weekData,
    ritualMoodCounts,
    totalRitualMoods,
    dominantRitualMood,
    momentMoodCounts,
    topMomentMoods,
    momentTypeCounts,
    dayActivityCounts,
    getWeekNarrative,
    getMoodNarrative,
    getMomentsNarrative,
  }
}
