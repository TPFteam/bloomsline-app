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
import {
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
  Camera,
  Video,
  Mic,
  PenLine,
  Droplet,
  Dumbbell,
  BookOpen,
  Brain,
  Footprints,
  Users,
  Cigarette,
  Wine,
  Cookie,
  Smartphone,
  Tv,
  Candy,
  Pizza,
  Wind,
  TreePine,
  Palette,
  Apple,
  Bed,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { type RitualCategory } from '@/lib/services/rituals'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ============================================
// CONSTANTS
// ============================================

const RITUAL_ICON_MAP: Record<string, any> = {
  'eye': Eye, 'coffee': Coffee, 'sprout': Sprout,
  'stretch-horizontal': StretchHorizontal, 'sun': Sun, 'map-pin': MapPin,
  'music': Music, 'cloud': Cloud, 'refresh-cw': RefreshCw, 'heart': Heart,
  'list': List, 'gift': Gift, 'moon': Moon, 'hand': Hand, 'stars': Stars,
  'calendar-heart': CalendarHeart, 'sofa': Sofa, 'mail': Mail,
  'smile': Smile, 'shield': Shield,
}

const ANCHOR_ICONS: Record<string, any> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookOpen, brain: Brain,
  bed: Bed, apple: Apple, meditation: Circle, walk: Footprints,
  social: Users, heart: Heart, sprout: Sprout, journal: PenLine,
  gratitude: Stars, nature: TreePine, creativity: Palette,
  breathing: Wind, stretch: StretchHorizontal, vegetables: Sprout, music: Music,
  cigarette: Cigarette, wine: Wine, coffee: Coffee, cookie: Cookie,
  smartphone: Smartphone, tv: Tv, candy: Candy, junkfood: Pizza,
}

const CATEGORY_META: Record<RitualCategory, {
  accent: string; lightBg: string; icon: any; label: string
}> = {
  morning:  { accent: '#f59e0b', lightBg: '#fef3c7', icon: Sun,    label: 'Morning' },
  midday:   { accent: '#059669', lightBg: '#d1fae5', icon: Coffee,  label: 'Afternoon' },
  evening:  { accent: '#6366f1', lightBg: '#e0e7ff', icon: Moon,    label: 'Evening' },
  selfcare: { accent: '#ec4899', lightBg: '#fce7f3', icon: Heart,   label: 'Self-care' },
}

const RITUAL_MOOD_EMOJIS: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  great:     { emoji: '😊', label: 'Great',     bg: '#ecfdf5', color: '#059669' },
  good:      { emoji: '🙂', label: 'Good',      bg: '#f0fdf4', color: '#22c55e' },
  okay:      { emoji: '😐', label: 'Okay',      bg: '#fefce8', color: '#eab308' },
  low:       { emoji: '😔', label: 'Low',        bg: '#fff7ed', color: '#f97316' },
  difficult: { emoji: '😣', label: 'Difficult',  bg: '#fef2f2', color: '#ef4444' },
}

const MOMENT_MOOD_COLORS: Record<string, string> = {
  grateful: '#f59e0b', peaceful: '#14b8a6', joyful: '#eab308',
  inspired: '#8b5cf6', loved: '#ec4899', calm: '#06b6d4',
  hopeful: '#22c55e', proud: '#ef4444', overwhelmed: '#f97316',
  tired: '#6b7280', uncertain: '#a78bfa',
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MOMENT_TYPE_META: Record<string, { icon: any; label: string }> = {
  photo: { icon: Camera, label: 'Photos' },
  video: { icon: Video, label: 'Videos' },
  voice: { icon: Mic, label: 'Voice' },
  write: { icon: PenLine, label: 'Writing' },
}

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
  const IconComp = RITUAL_ICON_MAP[iconName || ''] || Circle
  return <IconComp size={size} color={color} />
}

function getAnchorIcon(iconName: string, size = 20, color = '#6b7280') {
  const IconComp = ANCHOR_ICONS[iconName] || Circle
  return <IconComp size={size} color={color} />
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
// TYPES
// ============================================

type MomentRow = {
  id: string
  type: string
  moods: string[]
  created_at: string
}

type CompletionRow = {
  id: string
  ritual_id: string
  member_id: string
  completion_date: string
  completed: boolean
  mood: string | null
  notes: string | null
  duration_minutes: number | null
  ritual?: {
    name: string
    icon: string | null
    category: RitualCategory
  }
}

type MemberRitualRow = {
  id: string
  ritual_id: string
  planned_time: string | null
  ritual: {
    id: string
    name: string
    icon: string | null
    category: RitualCategory
    duration_suggestion: number | null
  }
}

type AnchorRow = {
  id: string
  icon: string
  label_en: string
  type: 'grow' | 'letgo'
}

type AnchorLogRow = {
  anchor_id: string
  log_date: string
}

// ============================================
// MAIN SCREEN
// ============================================

export default function ProgressScreen() {
  const { user, member } = useAuth()

  const [moments, setMoments] = useState<MomentRow[]>([])
  const [completions, setCompletions] = useState<CompletionRow[]>([])
  const [memberRituals, setMemberRituals] = useState<MemberRitualRow[]>([])
  const [anchors, setAnchors] = useState<AnchorRow[]>([])
  const [anchorLogs, setAnchorLogs] = useState<AnchorLogRow[]>([])
  const [sessionCount, setSessionCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const today = useMemo(() => fmtDate(new Date()), [])

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchData = useCallback(async () => {
    if (!user?.id || !member?.id) return

    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const cutoff = fmtDate(thirtyAgo)

    const [momentsRes, completionsRes, ritualsRes, anchorsRes, anchorLogsRes, sessionsRes] = await Promise.all([
      supabase
        .from('moments')
        .select('id, type, moods, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyAgo.toISOString()),
      supabase
        .from('ritual_completions')
        .select('*, ritual:rituals(name, icon, category)')
        .eq('member_id', member.id)
        .gte('completion_date', cutoff)
        .order('completion_date', { ascending: false }),
      supabase
        .from('member_rituals')
        .select('id, ritual_id, planned_time, ritual:rituals(id, name, icon, category, duration_suggestion)')
        .eq('member_id', member.id)
        .eq('is_active', true)
        .order('planned_time', { ascending: true, nullsFirst: false }),
      supabase
        .from('member_anchors')
        .select('id, icon, label_en, type')
        .eq('member_id', member.id)
        .eq('is_active', true),
      supabase
        .from('anchor_logs')
        .select('anchor_id, log_date')
        .eq('member_id', member.id)
        .gte('log_date', cutoff),
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .eq('status', 'completed'),
    ])

    const normalize = (r: any) => ({
      ...r,
      ritual: Array.isArray(r.ritual) ? r.ritual[0] || null : r.ritual,
    })

    setMoments((momentsRes.data ?? []) as MomentRow[])
    setCompletions((completionsRes.data ?? []).map(normalize) as CompletionRow[])
    setMemberRituals((ritualsRes.data ?? []).map(normalize) as MemberRitualRow[])
    setAnchors((anchorsRes.data ?? []) as AnchorRow[])
    setAnchorLogs((anchorLogsRes.data ?? []) as AnchorLogRow[])
    setSessionCount(sessionsRes.count ?? 0)
    setLoading(false)
  }, [user?.id, member?.id])

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

  // ============================================
  // WEEK DATA
  // ============================================

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

  // ============================================
  // MOOD DATA
  // ============================================

  // Ritual moods (great/good/okay/low/difficult)
  const ritualMoodCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of completions) {
      if (c.completed && c.mood) {
        counts[c.mood] = (counts[c.mood] || 0) + 1
      }
    }
    return counts
  }, [completions])

  const totalRitualMoods = useMemo(() => Object.values(ritualMoodCounts).reduce((a, b) => a + b, 0), [ritualMoodCounts])

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

  // ============================================
  // GRID DATA — 30-day combined
  // ============================================

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

  // ============================================
  // NARRATIVES
  // ============================================

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

  function getGridColor(total: number): string {
    if (total === 0) return '#f5f5f4'
    if (total === 1) return '#bbf7d0'
    if (total <= 3) return '#6ee7b7'
    if (total <= 5) return '#34d399'
    return '#059669'
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

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* ===== HEADER ===== */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 }}>
            Your Journey
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            Here's what I've noticed
          </Text>
        </View>

        {/* ===== SECTION 1: THIS WEEK ===== */}
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            This week
          </Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 20 }}>
            {getWeekNarrative()}
          </Text>

          {/* 7-day strip with 3 stacked dots */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {weekDays.map((dayStr, i) => {
              const hasRitual = (ritualCompletionsByDate[dayStr] || []).length > 0
              const hasSeed = !!anchorLogsByDate[dayStr]?.size
              const hasMoment = (momentsByDate[dayStr] || []).length > 0
              const isToday = dayStr === today

              return (
                <View key={dayStr} style={{
                  flex: 1, alignItems: 'center',
                  backgroundColor: isToday ? '#f0fdf4' : 'transparent',
                  borderRadius: 12, paddingVertical: 10,
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: '#059669',
                }}>
                  <Text style={{
                    fontSize: 11, fontWeight: isToday ? '700' : '500',
                    color: isToday ? '#059669' : '#9ca3af',
                    marginBottom: 8,
                  }}>
                    {DAY_LABELS[i]}
                  </Text>
                  {/* Ritual dot */}
                  <View style={{
                    width: 10, height: 10, borderRadius: 5, marginBottom: 4,
                    backgroundColor: hasRitual ? '#22c55e' : '#e5e7eb',
                  }} />
                  {/* Seed dot */}
                  <View style={{
                    width: 10, height: 10, borderRadius: 5, marginBottom: 4,
                    backgroundColor: hasSeed ? '#f59e0b' : '#e5e7eb',
                  }} />
                  {/* Moment dot */}
                  <View style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: hasMoment ? '#ec4899' : '#e5e7eb',
                  }} />
                </View>
              )
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
            {[
              { color: '#22c55e', label: 'Rituals' },
              { color: '#f59e0b', label: 'Seeds' },
              { color: '#ec4899', label: 'Moments' },
            ].map(item => (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ===== SECTION 2: HOW YOU'VE BEEN FEELING ===== */}
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
            How you've been feeling
          </Text>

          {totalRitualMoods > 0 || topMomentMoods.length > 0 ? (
            <>
              {/* Ritual mood circles */}
              {totalRitualMoods > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
                  {['great', 'good', 'okay', 'low', 'difficult'].map(mood => {
                    const count = ritualMoodCounts[mood] || 0
                    const meta = RITUAL_MOOD_EMOJIS[mood]
                    const ratio = totalRitualMoods > 0 ? count / totalRitualMoods : 0
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
              )}

              {/* Moment mood tags as pills */}
              {topMomentMoods.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {topMomentMoods.map(([mood, count]) => {
                    const color = MOMENT_MOOD_COLORS[mood] || '#6b7280'
                    return (
                      <View key={mood} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                        backgroundColor: `${color}1A`,
                      }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                        <Text style={{ fontSize: 12, fontWeight: '500', color, textTransform: 'capitalize' }}>
                          {mood}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af' }}>{count}</Text>
                      </View>
                    )
                  })}
                </View>
              )}

              {/* Mood narrative */}
              {getMoodNarrative() ? (
                <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, textAlign: 'center' }}>
                  {getMoodNarrative()}
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
                When you complete rituals or capture moments, your moods will appear here as a gentle mirror of your inner world.
              </Text>
            </View>
          )}
        </Card>

        {/* ===== SECTION 3: YOUR PRACTICES (Ritual pill cards) ===== */}
        {memberRituals.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4 }}>
              Your practices
            </Text>

            {memberRituals.map(r => {
              const cat = r.ritual?.category || 'morning'
              const meta = CATEGORY_META[cat as RitualCategory] || CATEGORY_META.morning
              const stats = ritualStats[r.ritual_id]
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
                    {stats && stats.currentStreak >= 2 && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: meta.lightBg,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4,
                      }}>
                        <Text style={{ fontSize: 13 }}>🔥</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: meta.accent }}>
                          {stats.currentStreak}
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
                    {weekCompleted === 7 ? 'Every day this week \u2014 incredible.'
                      : weekCompleted >= 5 ? `${weekCompleted} out of 7 this week \u2014 strong rhythm.`
                      : weekCompleted >= 3 ? `${weekCompleted} days this week \u2014 you're showing up.`
                      : weekCompleted > 0 ? `${weekCompleted} day${weekCompleted === 1 ? '' : 's'} this week \u2014 every one counts.`
                      : 'Not yet this week \u2014 today is always a good day to start.'
                    }
                  </Text>
                </Card>
              )
            })}
          </>
        )}

        {/* ===== SECTION 4: YOUR LITTLE STEPS (Seed pill cards) ===== */}
        {anchors.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4 }}>
              Your little steps
            </Text>

            {anchors.map(anchor => {
              const isGrow = anchor.type === 'grow'
              const accent = isGrow ? '#059669' : '#d97706'
              const lightBg = isGrow ? '#d1fae5' : '#fef3c7'
              const dateCounts = anchorLogMap[anchor.id] || {}
              const stats = anchorStats[anchor.id]
              const weekLogged = weekDays.filter(d => !!dateCounts[d]).length

              return (
                <Card key={anchor.id} style={{ padding: 16 }}>
                  {/* Header: icon + name + streak */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 10,
                      backgroundColor: lightBg,
                      alignItems: 'center', justifyContent: 'center', marginRight: 10,
                    }}>
                      {getAnchorIcon(anchor.icon, 16, accent)}
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1 }}>
                      {anchor.label_en}
                    </Text>
                    {stats && stats.currentStreak >= 2 && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: lightBg,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4,
                      }}>
                        <Text style={{ fontSize: 13 }}>🔥</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: accent }}>
                          {stats.currentStreak}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 7-day pill bar */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {weekDays.map((dayStr, i) => {
                      const logged = !!dateCounts[dayStr]
                      const isToday = dayStr === today

                      return (
                        <View key={i} style={{
                          flex: 1, height: 40, borderRadius: 12,
                          backgroundColor: logged ? accent : lightBg,
                          borderWidth: isToday && !logged ? 2 : 0,
                          borderColor: accent,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{
                            fontSize: 13,
                            fontWeight: logged ? '700' : '500',
                            color: logged ? '#ffffff' : '#c4c4c4',
                          }}>
                            {logged ? '' : '-'}
                          </Text>
                        </View>
                      )
                    })}
                  </View>

                  {/* Day labels */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {DAY_LABELS.map((label, i) => (
                      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 10, fontWeight: weekDays[i] === today ? '700' : '400',
                          color: weekDays[i] === today ? accent : '#b0b0b0',
                        }}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Friendly note */}
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
                    {weekLogged === 7 ? `Every day this week \u2014 ${isGrow ? 'growing strong' : 'real discipline'}.`
                      : weekLogged >= 5 ? `${weekLogged} out of 7 \u2014 ${isGrow ? 'steady growth' : 'strong willpower'}.`
                      : weekLogged >= 3 ? `${weekLogged} days this week \u2014 you're building a habit.`
                      : weekLogged > 0 ? `${weekLogged} day${weekLogged === 1 ? '' : 's'} this week \u2014 every step matters.`
                      : `Not yet this week \u2014 ${isGrow ? 'plant a seed today' : 'today is a fresh start'}.`
                    }
                  </Text>
                </Card>
              )
            })}
          </>
        )}

        {/* ===== SECTION 5: YOUR MOMENTS ===== */}
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
            Your moments
          </Text>

          {moments.length > 0 ? (
            <>
              {/* Total + type breakdown */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: '#fce7f3',
                  alignItems: 'center', justifyContent: 'center', marginRight: 14,
                }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#ec4899' }}>{moments.length}</Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {(['photo', 'video', 'voice', 'write'] as const).map(type => {
                    const count = momentTypeCounts[type] || 0
                    if (count === 0) return null
                    const meta = MOMENT_TYPE_META[type]
                    const TypeIcon = meta.icon
                    return (
                      <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TypeIcon size={14} color="#9ca3af" />
                        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{count}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>

              {/* Top mood tags */}
              {topMomentMoods.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {topMomentMoods.slice(0, 3).map(([mood]) => {
                    const color = MOMENT_MOOD_COLORS[mood] || '#6b7280'
                    return (
                      <View key={mood} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                        backgroundColor: `${color}1A`,
                      }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                        <Text style={{ fontSize: 12, fontWeight: '500', color, textTransform: 'capitalize' }}>
                          {mood}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}

              {/* Narrative */}
              <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
                {getMomentsNarrative()}
              </Text>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>📸</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                No moments yet this month
              </Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
                When something moves you, capture it. Photos, voice notes, writing — it all counts.
              </Text>
            </View>
          )}
        </Card>

        {/* ===== SECTION 6: THE BIGGER PICTURE (30-day grid) ===== */}
        <Card>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
            The bigger picture
          </Text>

          {/* 30-day grid, 7 per row */}
          {(() => {
            const GAP = 6
            // ScrollView padding (20*2) + Card padding (20*2) = 80
            const availableWidth = SCREEN_WIDTH - 80
            const cellSize = Math.floor((availableWidth - GAP * 6) / 7)
            const rows: string[][] = []
            for (let i = 0; i < monthDays.length; i += 7) {
              rows.push(monthDays.slice(i, i + 7))
            }
            return (
              <View style={{ gap: GAP }}>
                {rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: GAP }}>
                    {row.map(dayStr => {
                      const act = dayActivityCounts[dayStr]
                      const total = act ? act.rituals + act.seeds + act.moments : 0
                      const isToday = dayStr === today
                      const dayNum = parseInt(dayStr.split('-')[2], 10)

                      return (
                        <TouchableOpacity
                          key={dayStr}
                          onPress={() => setExpandedDay(expandedDay === dayStr ? null : dayStr)}
                          activeOpacity={0.7}
                          style={{
                            width: cellSize, height: cellSize, borderRadius: 8,
                            backgroundColor: getGridColor(total),
                            borderWidth: isToday ? 2.5 : expandedDay === dayStr ? 2 : 0,
                            borderColor: isToday ? '#059669' : '#9ca3af',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Text style={{
                            fontSize: 10, fontWeight: isToday ? '700' : '500',
                            color: total >= 4 ? '#ffffff' : '#78716c',
                          }}>
                            {dayNum}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                ))}
              </View>
            )
          })()}

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 4 }}>
            <Text style={{ fontSize: 10, color: '#9ca3af', marginRight: 4 }}>Less</Text>
            {['#f5f5f4', '#bbf7d0', '#6ee7b7', '#34d399', '#059669'].map((c, i) => (
              <View key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
            ))}
            <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>More</Text>
          </View>

          {/* Expanded day panel */}
          {expandedDay && (() => {
            const dayRituals = ritualCompletionsByDate[expandedDay] || []
            const daySeedIds = anchorLogsByDate[expandedDay]
            const dayMoments = momentsByDate[expandedDay] || []
            const hasAny = dayRituals.length > 0 || (daySeedIds?.size || 0) > 0 || dayMoments.length > 0

            return (
              <View style={{ marginTop: 14, backgroundColor: '#faf5f0', borderRadius: 14, padding: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
                  {new Date(expandedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>

                {!hasAny ? (
                  <Text style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                    A rest day. Those matter too.
                  </Text>
                ) : (
                  <>
                    {/* Rituals */}
                    {dayRituals.length > 0 && (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Rituals
                        </Text>
                        {dayRituals.map(c => {
                          const cat = c.ritual?.category || 'morning'
                          const meta = CATEGORY_META[cat as RitualCategory] || CATEGORY_META.morning
                          return (
                            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <View style={{
                                width: 22, height: 22, borderRadius: 7,
                                backgroundColor: meta.lightBg,
                                alignItems: 'center', justifyContent: 'center', marginRight: 8,
                              }}>
                                {getRitualIcon(c.ritual?.icon || null, 12, meta.accent)}
                              </View>
                              <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>{c.ritual?.name || 'Ritual'}</Text>
                              {c.mood && RITUAL_MOOD_EMOJIS[c.mood] && (
                                <Text style={{ fontSize: 12 }}>{RITUAL_MOOD_EMOJIS[c.mood].emoji}</Text>
                              )}
                            </View>
                          )
                        })}
                      </View>
                    )}

                    {/* Seeds */}
                    {daySeedIds && daySeedIds.size > 0 && (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Seeds
                        </Text>
                        {anchors.filter(a => daySeedIds.has(a.id)).map(anchor => {
                          const isGrow = anchor.type === 'grow'
                          return (
                            <View key={anchor.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <View style={{
                                width: 22, height: 22, borderRadius: 7,
                                backgroundColor: isGrow ? '#d1fae5' : '#fef3c7',
                                alignItems: 'center', justifyContent: 'center', marginRight: 8,
                              }}>
                                {getAnchorIcon(anchor.icon, 12, isGrow ? '#059669' : '#d97706')}
                              </View>
                              <Text style={{ fontSize: 13, color: '#374151' }}>{anchor.label_en}</Text>
                            </View>
                          )
                        })}
                      </View>
                    )}

                    {/* Moments */}
                    {dayMoments.length > 0 && (
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#ec4899', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                          Moments
                        </Text>
                        <Text style={{ fontSize: 13, color: '#374151' }}>
                          {dayMoments.length} moment{dayMoments.length !== 1 ? 's' : ''} captured
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )
          })()}
        </Card>

        {/* ===== SESSION COUNT (subtle) ===== */}
        {sessionCount > 0 && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginBottom: 16,
          }}>
            <Text style={{ fontSize: 13, color: '#9ca3af' }}>
              {sessionCount} session{sessionCount !== 1 ? 's' : ''} completed with your practitioner
            </Text>
          </View>
        )}

        {/* ===== CLOSING ===== */}
        <View style={{ alignItems: 'center', paddingVertical: 8, paddingBottom: 20 }}>
          <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
            This isn't about being perfect.{'\n'}It's about noticing — and that's already enough.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
