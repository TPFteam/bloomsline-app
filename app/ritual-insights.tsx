import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Sun,
  Moon,
  Coffee,
  Heart,
  Eye,
  Sprout,
  StretchHorizontal,
  MapPin,
  Music,
  Cloud,
  RefreshCw,
  List,
  Gift,
  Hand,
  Stars,
  CalendarHeart,
  Sofa,
  Mail,
  Smile,
  Shield,
  Circle,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { type RitualCategory, type RitualCompletion } from '@/lib/services/rituals'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ============================================
// CONSTANTS
// ============================================

const ICON_MAP: Record<string, any> = {
  'eye': Eye, 'coffee': Coffee, 'sprout': Sprout,
  'stretch-horizontal': StretchHorizontal, 'sun': Sun, 'map-pin': MapPin,
  'music': Music, 'cloud': Cloud, 'refresh-cw': RefreshCw, 'heart': Heart,
  'list': List, 'gift': Gift, 'moon': Moon, 'hand': Hand, 'stars': Stars,
  'calendar-heart': CalendarHeart, 'sofa': Sofa, 'mail': Mail,
  'smile': Smile, 'shield': Shield,
}

const CATEGORY_META: Record<RitualCategory, {
  accent: string; lightBg: string; icon: any; label: string
}> = {
  morning:  { accent: '#f59e0b', lightBg: '#fef3c7', icon: Sun,    label: 'Morning' },
  midday:   { accent: '#059669', lightBg: '#d1fae5', icon: Coffee,  label: 'Afternoon' },
  evening:  { accent: '#6366f1', lightBg: '#e0e7ff', icon: Moon,    label: 'Evening' },
  selfcare: { accent: '#ec4899', lightBg: '#fce7f3', icon: Heart,   label: 'Self-care' },
}

const MOOD_EMOJIS: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  great:     { emoji: '😊', label: 'Great',     bg: '#ecfdf5', color: '#059669' },
  good:      { emoji: '🙂', label: 'Good',      bg: '#f0fdf4', color: '#22c55e' },
  okay:      { emoji: '😐', label: 'Okay',      bg: '#fefce8', color: '#eab308' },
  low:       { emoji: '😔', label: 'Low',        bg: '#fff7ed', color: '#f97316' },
  difficult: { emoji: '😣', label: 'Difficult',  bg: '#fef2f2', color: '#ef4444' },
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ============================================
// HELPERS
// ============================================

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function getRitualIcon(iconName: string | null, size = 20, color = '#6b7280') {
  const IconComp = ICON_MAP[iconName || ''] || Circle
  return <IconComp size={size} color={color} />
}

// ============================================
// TYPES
// ============================================

type RitualWithDetails = {
  id: string
  ritual_id: string
  is_active: boolean
  planned_time: string | null
  ritual: {
    id: string
    name: string
    icon: string | null
    category: RitualCategory
    duration_suggestion: number | null
  }
}

type CompletionRow = RitualCompletion & {
  ritual?: {
    id: string
    name: string
    icon: string | null
    category: RitualCategory
  }
}

type MemberRitualDates = {
  ritual_id: string
  is_active: boolean
  added_at: string | null
  removed_at: string | null
}

// ============================================
// CARD WRAPPER
// ============================================

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={{
      backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginBottom: 20,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
      ...style,
    }}>
      {children}
    </View>
  )
}

// ============================================
// MAIN SCREEN
// ============================================

export default function RitualInsightsScreen() {
  const { member } = useAuth()
  const router = useRouter()
  const [rituals, setRituals] = useState<RitualWithDetails[]>([])
  const [completions, setCompletions] = useState<CompletionRow[]>([])
  const [allMemberRituals, setAllMemberRituals] = useState<MemberRitualDates[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const today = useMemo(() => fmtDate(new Date()), [])

  const fetchData = useCallback(async () => {
    if (!member?.id) return

    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const cutoff = fmtDate(thirtyAgo)

    const [ritualsRes, completionsRes, allMrRes] = await Promise.all([
      supabase
        .from('member_rituals')
        .select('id, ritual_id, is_active, planned_time, ritual:rituals(id, name, icon, category, duration_suggestion)')
        .eq('member_id', member.id)
        .eq('is_active', true)
        .order('planned_time', { ascending: true, nullsFirst: false }),
      supabase
        .from('ritual_completions')
        .select('*, ritual:rituals(id, name, icon, category)')
        .eq('member_id', member.id)
        .gte('completion_date', cutoff)
        .order('completion_date', { ascending: false }),
      supabase
        .from('member_rituals')
        .select('ritual_id, is_active, added_at, removed_at')
        .eq('member_id', member.id),
    ])

    const normalize = (r: any) => ({
      ...r,
      ritual: Array.isArray(r.ritual) ? r.ritual[0] || null : r.ritual,
    })

    setRituals((ritualsRes.data ?? []).map(normalize) as RitualWithDetails[])
    setCompletions((completionsRes.data ?? []).map(normalize) as CompletionRow[])
    setAllMemberRituals((allMrRes.data ?? []) as MemberRitualDates[])
    setLoading(false)
  }, [member?.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // ============================================
  // DERIVED DATA
  // ============================================

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

  const completionsByDate = useMemo(() => {
    const map: Record<string, CompletionRow[]> = {}
    for (const c of completions) {
      if (!map[c.completion_date]) map[c.completion_date] = []
      map[c.completion_date].push(c)
    }
    return map
  }, [completions])

  const activeCountForDate = useMemo(() => {
    return (dateStr: string): number => {
      const d = new Date(dateStr + 'T12:00:00')
      let count = 0
      for (const mr of allMemberRituals) {
        const added = mr.added_at ? new Date(mr.added_at) : null
        const removed = mr.removed_at ? new Date(mr.removed_at) : null
        if (added && added > d) continue
        if (removed && removed < d && !mr.is_active) continue
        count++
      }
      return count || rituals.length || 1
    }
  }, [allMemberRituals, rituals.length])

  const ritualCompletionMap = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const c of completions) {
      if (!c.completed) continue
      if (!map[c.ritual_id]) map[c.ritual_id] = new Set()
      map[c.ritual_id].add(c.completion_date)
    }
    return map
  }, [completions])

  const ritualsByCategory = useMemo(() => {
    const groups: Record<string, RitualWithDetails[]> = {
      morning: [], midday: [], evening: [], selfcare: [],
    }
    for (const r of rituals) {
      const cat = r.ritual?.category || 'morning'
      if (groups[cat]) groups[cat].push(r)
    }
    return groups
  }, [rituals])

  // Per-ritual per-day detail: ritual_id → dateStr → { duration }
  const ritualDayDetail = useMemo(() => {
    const map: Record<string, Record<string, { duration: number | null }>> = {}
    for (const c of completions) {
      if (!c.completed) continue
      if (!map[c.ritual_id]) map[c.ritual_id] = {}
      map[c.ritual_id][c.completion_date] = { duration: c.duration_minutes }
    }
    return map
  }, [completions])

  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of completions) {
      if (c.completed && c.mood) {
        counts[c.mood] = (counts[c.mood] || 0) + 1
      }
    }
    return counts
  }, [completions])

  const totalMoods = useMemo(() => Object.values(moodCounts).reduce((a, b) => a + b, 0), [moodCounts])

  const dominantMood = useMemo(() => {
    let best = ''
    let bestCount = 0
    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > bestCount) { best = mood; bestCount = count }
    }
    return best
  }, [moodCounts])

  const dayRatio = useMemo(() => {
    const map: Record<string, number> = {}
    for (const dayStr of monthDays) {
      const dayCompletions = completionsByDate[dayStr] || []
      const completed = dayCompletions.filter(c => c.completed).length
      const active = activeCountForDate(dayStr)
      map[dayStr] = active > 0 ? completed / active : 0
    }
    return map
  }, [monthDays, completionsByDate, activeCountForDate])

  const ritualStats = useMemo(() => {
    const stats: Record<string, {
      currentStreak: number; bestStreak: number; completionRate: number
      avgDuration: number | null; daysCompleted: number
    }> = {}

    for (const r of rituals) {
      const dates = ritualCompletionMap[r.ritual_id] || new Set<string>()

      let currentStreak = 0
      const d = new Date()
      if (dates.has(fmtDate(d))) { currentStreak = 1; d.setDate(d.getDate() - 1) }
      else { d.setDate(d.getDate() - 1) }
      while (dates.has(fmtDate(d))) { currentStreak++; d.setDate(d.getDate() - 1) }

      let bestStreak = 0, run = 0
      for (const dayStr of monthDays) {
        if (dates.has(dayStr)) { run++; if (run > bestStreak) bestStreak = run }
        else run = 0
      }

      const daysCompleted = monthDays.filter(d => dates.has(d)).length

      const durations = completions
        .filter(c => c.ritual_id === r.ritual_id && c.completed && c.duration_minutes != null)
        .map(c => c.duration_minutes!)
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

      stats[r.ritual_id] = { currentStreak, bestStreak, completionRate: Math.round((daysCompleted / 30) * 100), avgDuration, daysCompleted }
    }
    return stats
  }, [rituals, ritualCompletionMap, monthDays, completions])

  // ============================================
  // NARRATIVE BUILDERS
  // ============================================

  // How many days this week had at least one completion?
  const weekActiveDays = useMemo(() => {
    let count = 0
    for (const dayStr of weekDays) {
      const dayComps = completionsByDate[dayStr] || []
      if (dayComps.some(c => c.completed)) count++
    }
    return count
  }, [weekDays, completionsByDate])

  // How many days in the month had at least one completion?
  const monthActiveDays = useMemo(() => {
    let count = 0
    for (const dayStr of monthDays) {
      const dayComps = completionsByDate[dayStr] || []
      if (dayComps.some(c => c.completed)) count++
    }
    return count
  }, [monthDays, completionsByDate])

  // Trend: compare first 15 days vs last 15 days
  const monthTrend = useMemo(() => {
    let first = 0, second = 0
    monthDays.slice(0, 15).forEach(d => { if ((completionsByDate[d] || []).some(c => c.completed)) first++ })
    monthDays.slice(15).forEach(d => { if ((completionsByDate[d] || []).some(c => c.completed)) second++ })
    if (second > first + 2) return 'growing'
    if (first > second + 2) return 'slowing'
    return 'steady'
  }, [monthDays, completionsByDate])

  // Strongest ritual (highest completion rate)
  const strongestRitual = useMemo(() => {
    let best: RitualWithDetails | null = null
    let bestDays = 0
    for (const r of rituals) {
      const s = ritualStats[r.ritual_id]
      if (s && s.daysCompleted > bestDays) { bestDays = s.daysCompleted; best = r }
    }
    return best
  }, [rituals, ritualStats])

  // Week narrative
  function getWeekNarrative(): { title: string; subtitle: string } {
    if (rituals.length === 0) return {
      title: "Your week is a blank canvas",
      subtitle: "Add some rituals and come back — this page will come alive with your journey.",
    }
    const todayIdx = weekDays.indexOf(today)
    const daysElapsed = todayIdx >= 0 ? todayIdx + 1 : 7

    if (weekActiveDays === 0) return {
      title: "A quiet week so far",
      subtitle: "No pressure. When you're ready, even one small ritual can shift the day.",
    }
    if (weekActiveDays === daysElapsed && daysElapsed >= 3) return {
      title: "Every single day — you're all in",
      subtitle: "You haven't missed a day this week. That kind of presence is rare.",
    }
    if (weekActiveDays >= daysElapsed - 1 && daysElapsed >= 3) return {
      title: `${weekActiveDays} out of ${daysElapsed} days — so consistent`,
      subtitle: "You're showing up for yourself almost every day. That's real commitment.",
    }
    if (weekActiveDays >= Math.ceil(daysElapsed / 2)) return {
      title: `You showed up ${weekActiveDays} days this week`,
      subtitle: "More than half the week and counting. Each day you choose yourself.",
    }
    return {
      title: `${weekActiveDays} moment${weekActiveDays === 1 ? '' : 's'} of presence this week`,
      subtitle: "Even a single day of showing up matters. You're building something.",
    }
  }

  // Month narrative
  function getMonthNarrative(): { title: string; subtitle: string } {
    if (monthActiveDays === 0) return {
      title: "A fresh chapter",
      subtitle: "The last 30 days are behind you. Today is where it begins.",
    }
    if (monthActiveDays >= 25) return {
      title: `${monthActiveDays} days of showing up`,
      subtitle: monthTrend === 'growing'
        ? "And you're getting even stronger. Your rhythm is becoming second nature."
        : "That's remarkable consistency. Your rituals are woven into your life now.",
    }
    if (monthActiveDays >= 15) return {
      title: `${monthActiveDays} days in the last month`,
      subtitle: monthTrend === 'growing'
        ? "And you're building momentum — the recent days look even stronger."
        : monthTrend === 'slowing'
          ? "You started strong. Gentle reminder: you don't need a perfect streak, just keep going."
          : "A steady, honest rhythm. You're showing up more often than not.",
    }
    if (monthActiveDays >= 7) return {
      title: `${monthActiveDays} days — you're finding your rhythm`,
      subtitle: monthTrend === 'growing'
        ? "And it's growing. You're practicing more this week than you were two weeks ago."
        : "Some days you show up, some days you rest. Both are part of the journey.",
    }
    return {
      title: `${monthActiveDays} day${monthActiveDays === 1 ? '' : 's'} over the last month`,
      subtitle: "Every day you choose to show up is a day that counts. Start small, stay gentle.",
    }
  }

  // Mood narrative
  function getMoodNarrative(): string {
    if (totalMoods === 0) return ''
    const moodMap: Record<string, string> = {
      great:     "You've been feeling wonderful lately. Whatever you're doing, it's working — keep honoring what lights you up.",
      good:      "Most of your check-ins feel steady and grounded. Your rituals seem to be nourishing you well.",
      okay:      "You've been in an okay place. That's honest, and showing up even when it's just 'okay' takes quiet strength.",
      low:       "It's been a heavier stretch. But you're still here, still checking in. That matters more than you think.",
      difficult: "Things have been hard lately. The fact that you keep going, even on difficult days — that takes real courage.",
    }
    return moodMap[dominantMood] || ''
  }

  // Strongest ritual narrative
  function getStrongestNarrative(): string | null {
    if (!strongestRitual) return null
    const stats = ritualStats[strongestRitual.ritual_id]
    if (!stats || stats.daysCompleted === 0) return null

    const name = strongestRitual.ritual.name
    if (stats.currentStreak >= 7) {
      return `${name} has been your anchor — ${stats.currentStreak} days in a row and counting. That's a real practice now.`
    }
    if (stats.daysCompleted >= 20) {
      return `${name} is becoming part of who you are. ${stats.daysCompleted} out of the last 30 days.`
    }
    if (stats.currentStreak >= 3) {
      return `You've been consistent with ${name} lately — ${stats.currentStreak} days straight. Keep going.`
    }
    if (stats.daysCompleted >= 10) {
      return `${name} is your most practiced ritual — ${stats.daysCompleted} days this month. It's clearly important to you.`
    }
    return `${name} is where you show up most. Every time you do, you're choosing yourself.`
  }

  // ============================================
  // RENDER HELPERS
  // ============================================

  function getGridColor(ratio: number): string {
    if (ratio === 0) return '#f5f5f4'
    if (ratio <= 0.33) return '#bbf7d0'
    if (ratio <= 0.66) return '#6ee7b7'
    if (ratio < 1) return '#34d399'
    return '#059669'
  }

  function completionsForDay(dateStr: string) {
    return (completionsByDate[dateStr] || []).filter(c => c.completed)
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    )
  }

  const categoryOrder: RitualCategory[] = ['morning', 'midday', 'evening']
  const weekNarrative = getWeekNarrative()
  const monthNarrative = getMonthNarrative()
  const moodNarrative = getMoodNarrative()
  const strongestNarrative = getStrongestNarrative()

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={{
              width: 34, height: 34, borderRadius: 11,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
          >
            <ChevronLeft size={20} color="#4b5563" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.5 }}>
              Your Rituals
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              A gentle look at how you're doing
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* ===== THIS WEEK — narrative + dots ===== */}
        <Card>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1a1a1a', lineHeight: 26, marginBottom: 4 }}>
            {weekNarrative.title}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 20 }}>
            {weekNarrative.subtitle}
          </Text>

          {rituals.length > 0 && (
            <>
              {/* Day labels */}
              <View style={{ flexDirection: 'row', marginBottom: 10, paddingLeft: SCREEN_WIDTH * 0.28 }}>
                {DAY_LABELS.map((label, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 11,
                      fontWeight: weekDays[i] === today ? '700' : '500',
                      color: weekDays[i] === today ? '#059669' : '#9ca3af',
                    }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Ritual rows by category */}
              {categoryOrder.map(cat => {
                const catRituals = ritualsByCategory[cat] || []
                if (catRituals.length === 0) return null
                const meta = CATEGORY_META[cat]
                const CatIcon = meta.icon

                return (
                  <View key={cat} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <CatIcon size={10} color={meta.accent} />
                      <Text style={{ fontSize: 10, fontWeight: '600', color: meta.accent, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {meta.label}
                      </Text>
                    </View>
                    {catRituals.map(r => {
                      const dates = ritualCompletionMap[r.ritual_id] || new Set()
                      return (
                        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', width: SCREEN_WIDTH * 0.28 }}>
                            {getRitualIcon(r.ritual.icon, 14, meta.accent)}
                            <Text numberOfLines={1} style={{ fontSize: 12, color: '#374151', flex: 1, marginLeft: 6 }}>
                              {r.ritual.name}
                            </Text>
                          </View>
                          <View style={{ flex: 1, flexDirection: 'row' }}>
                            {weekDays.map((dayStr, i) => {
                              const done = dates.has(dayStr)
                              const isToday = dayStr === today
                              return (
                                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                  <View style={{
                                    width: 22, height: 22, borderRadius: 11,
                                    backgroundColor: done ? meta.accent : isToday ? 'transparent' : meta.lightBg,
                                    borderWidth: isToday && !done ? 2 : 0,
                                    borderColor: meta.accent,
                                  }} />
                                </View>
                              )
                            })}
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )
              })}
            </>
          )}
        </Card>

        {/* ===== MOOD — narrative + circles ===== */}
        <Card>
          {totalMoods > 0 ? (
            <>
              {/* Mood circles */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
                {['great', 'good', 'okay', 'low', 'difficult'].map(mood => {
                  const count = moodCounts[mood] || 0
                  const meta = MOOD_EMOJIS[mood]
                  const ratio = totalMoods > 0 ? count / totalMoods : 0
                  const size = Math.round(28 + ratio * 28)
                  return (
                    <View key={mood} style={{ alignItems: 'center' }}>
                      <View style={{
                        width: size, height: size, borderRadius: size / 2,
                        backgroundColor: count > 0 ? meta.bg : '#f5f5f4',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: Math.round(size * 0.45) }}>{meta.emoji}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: count > 0 ? meta.color : '#d1d5db', marginTop: 4 }}>
                        {meta.label}
                      </Text>
                    </View>
                  )
                })}
              </View>

              {/* Warm narrative */}
              {moodNarrative ? (
                <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', lineHeight: 20 }}>
                  {moodNarrative}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🌱</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                Your feelings matter here
              </Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
                When you complete a ritual, you can check in with how you're feeling. Over time, this becomes a gentle mirror of your inner world.
              </Text>
            </View>
          )}
        </Card>

        {/* ===== THE LAST 30 DAYS — narrative + grid ===== */}
        <Card>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1a1a1a', lineHeight: 26, marginBottom: 4 }}>
            {monthNarrative.title}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 20 }}>
            {monthNarrative.subtitle}
          </Text>

          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {monthDays.map(dayStr => {
              const ratio = dayRatio[dayStr] || 0
              const isToday = dayStr === today
              const dayNum = parseInt(dayStr.split('-')[2], 10)
              return (
                <TouchableOpacity
                  key={dayStr}
                  onPress={() => setExpandedDay(expandedDay === dayStr ? null : dayStr)}
                  activeOpacity={0.7}
                  style={{
                    width: (SCREEN_WIDTH - 40 - 40 - 36) / 7,
                    aspectRatio: 1, borderRadius: 8,
                    backgroundColor: getGridColor(ratio),
                    borderWidth: isToday ? 2.5 : expandedDay === dayStr ? 2 : 0,
                    borderColor: isToday ? '#059669' : '#9ca3af',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 10, fontWeight: isToday ? '700' : '500',
                    color: ratio >= 0.67 ? '#ffffff' : '#78716c',
                  }}>
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 4 }}>
            <Text style={{ fontSize: 10, color: '#9ca3af', marginRight: 4 }}>Less</Text>
            {['#f5f5f4', '#bbf7d0', '#6ee7b7', '#34d399', '#059669'].map((c, i) => (
              <View key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
            ))}
            <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>More</Text>
          </View>

          {/* Expanded day */}
          {expandedDay && (
            <View style={{ marginTop: 14, backgroundColor: '#faf5f0', borderRadius: 14, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                {new Date(expandedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              {completionsForDay(expandedDay).length > 0 ? (
                completionsForDay(expandedDay).map(c => {
                  const cat = c.ritual?.category || 'morning'
                  const meta = CATEGORY_META[cat as RitualCategory] || CATEGORY_META.morning
                  const moodMeta = c.mood ? MOOD_EMOJIS[c.mood] : null
                  return (
                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: meta.lightBg,
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                      }}>
                        {getRitualIcon(c.ritual?.icon || null, 14, meta.accent)}
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{c.ritual?.name || 'Ritual'}</Text>
                      {moodMeta && (
                        <Text style={{ fontSize: 14, marginRight: 6 }}>{moodMeta.emoji}</Text>
                      )}
                      {c.duration_minutes != null && (
                        <Text style={{ fontSize: 11, color: '#9ca3af' }}>{c.duration_minutes}m</Text>
                      )}
                    </View>
                  )
                })
              ) : (
                <Text style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>A rest day. Those matter too.</Text>
              )}
            </View>
          )}
        </Card>

        {/* ===== YOUR PRACTICES — 7-day pill cards ===== */}
        {rituals.length > 0 && (
          <>
            {/* Strongest ritual narrative */}
            {strongestNarrative && (
              <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22 }}>
                  {strongestNarrative}
                </Text>
              </View>
            )}

            {rituals.map(r => {
              const cat = r.ritual?.category || 'morning'
              const meta = CATEGORY_META[cat as RitualCategory] || CATEGORY_META.morning
              const stats = ritualStats[r.ritual_id]
              if (!stats) return null
              const dayDetails = ritualDayDetail[r.ritual_id] || {}
              const weekCompleted = weekDays.filter(d => !!dayDetails[d]).length

              return (
                <Card key={r.id} style={{ padding: 16 }}>
                  {/* Header: icon + name + streak */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 10,
                      backgroundColor: meta.lightBg,
                      alignItems: 'center', justifyContent: 'center', marginRight: 10,
                    }}>
                      {getRitualIcon(r.ritual.icon, 16, meta.accent)}
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1 }}>
                      {r.ritual.name}
                    </Text>
                    {stats.currentStreak >= 2 && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: meta.lightBg,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4,
                      }}>
                        <Text style={{ fontSize: 13 }}>🔥</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: meta.accent }}>
                          {stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 7-day pill bar */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {weekDays.map((dayStr, i) => {
                      const detail = dayDetails[dayStr]
                      const done = !!detail
                      const isToday = dayStr === today
                      const dur = detail?.duration
                      const pillLabel = done
                        ? (dur != null ? `${Math.round(dur)}` : '')
                        : '-'

                      return (
                        <View key={i} style={{
                          flex: 1, height: 40, borderRadius: 12,
                          backgroundColor: done ? meta.accent : meta.lightBg,
                          borderWidth: isToday && !done ? 2 : 0,
                          borderColor: meta.accent,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{
                            fontSize: done && dur != null ? 14 : 13,
                            fontWeight: done ? '700' : '500',
                            color: done ? '#ffffff' : '#c4c4c4',
                          }}>
                            {pillLabel}
                          </Text>
                        </View>
                      )
                    })}
                  </View>

                  {/* Day labels under pills */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {DAY_LABELS.map((label, i) => (
                      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 10, fontWeight: weekDays[i] === today ? '700' : '400',
                          color: weekDays[i] === today ? meta.accent : '#b0b0b0',
                        }}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Friendly note */}
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
                    {weekCompleted === 7 ? 'Every day this week — incredible.'
                      : weekCompleted >= 5 ? `${weekCompleted} out of 7 this week — strong rhythm.`
                      : weekCompleted >= 3 ? `${weekCompleted} days this week — you're showing up.`
                      : weekCompleted > 0 ? `${weekCompleted} day${weekCompleted === 1 ? '' : 's'} this week — every one counts.`
                      : 'Not yet this week — today is always a good day to start.'
                    }
                  </Text>
                </Card>
              )
            })}
          </>
        )}

        {/* ===== GENTLE CLOSING ===== */}
        <View style={{ alignItems: 'center', paddingVertical: 8, paddingBottom: 20 }}>
          <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
            This isn't about being perfect.{'\n'}It's about noticing — and that's already enough.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
