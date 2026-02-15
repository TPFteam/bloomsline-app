import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Sparkles,
  Circle,
  Heart,
  BookOpen,
  Dumbbell,
  Droplet,
  Coffee,
  Brain,
  Footprints,
  Users,
  PenLine,
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
  Music,
  StretchHorizontal,
  Trophy,
  BarChart3,
  Hash,
  Trash2,
  History,
  PlusCircle,
  MinusCircle,
  RefreshCw,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const ANCHOR_ICONS: Record<string, any> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookOpen, brain: Brain,
  bed: Bed, apple: Apple, meditation: Circle, walk: Footprints,
  social: Users, heart: Heart, sprout: Sparkles, journal: PenLine,
  gratitude: Sparkles, nature: TreePine, creativity: Palette,
  breathing: Wind, stretch: StretchHorizontal, vegetables: Sparkles, music: Music,
  cigarette: Cigarette, wine: Wine, coffee: Coffee, cookie: Cookie,
  smartphone: Smartphone, tv: Tv, candy: Candy, junkfood: Pizza,
}

type Anchor = {
  id: string
  icon: string
  label_en: string
  label_fr: string
  type: 'grow' | 'letgo'
}

type AnchorLog = {
  anchor_id: string
  log_date: string
}

type ActivityLog = {
  id: string
  anchor_icon: string
  anchor_label_en: string
  anchor_type: 'grow' | 'letgo'
  action: 'added' | 'removed' | 'reactivated'
  created_at: string
}

// Helper: format date as YYYY-MM-DD in local time
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Helper: get Monday of the week containing `d`
function getMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function SeedsScreen() {
  const { member } = useAuth()
  const router = useRouter()
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [logs, setLogs] = useState<AnchorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [growthView, setGrowthView] = useState<'visual' | 'data'>('visual')
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const today = useMemo(() => fmtDate(new Date()), [])

  const fetchData = useCallback(async () => {
    if (!member?.id) return

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 180)
    const cutoffStr = fmtDate(cutoff)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [anchorsRes, logsRes, activityRes] = await Promise.all([
      supabase
        .from('member_anchors')
        .select('id, icon, label_en, label_fr, type')
        .eq('member_id', member.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('anchor_logs')
        .select('anchor_id, log_date')
        .eq('member_id', member.id)
        .gte('log_date', cutoffStr),
      supabase
        .from('anchor_activity_logs')
        .select('id, anchor_icon, anchor_label_en, anchor_type, action, created_at')
        .eq('member_id', member.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
    ])

    setAnchors((anchorsRes.data ?? []) as Anchor[])
    setLogs((logsRes.data ?? []) as AnchorLog[])
    setActivityLogs((activityRes.data ?? []) as ActivityLog[])
    setLoading(false)
  }, [member?.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  async function deleteAnchor(anchorId: string) {
    const anchor = anchors.find(a => a.id === anchorId)
    if (!anchor || !member?.id) return

    await Promise.all([
      supabase
        .from('member_anchors')
        .update({ is_active: false })
        .eq('id', anchorId),
      supabase
        .from('anchor_activity_logs')
        .insert({
          member_id: member.id,
          anchor_id: anchorId,
          action: 'removed',
          anchor_type: anchor.type,
          anchor_icon: anchor.icon,
          anchor_label_en: anchor.label_en,
          anchor_label_fr: anchor.label_fr,
        }),
    ])

    setAnchors(prev => prev.filter(a => a.id !== anchorId))
    setActivityLogs(prev => [{
      id: crypto.randomUUID(),
      anchor_icon: anchor.icon,
      anchor_label_en: anchor.label_en,
      anchor_type: anchor.type,
      action: 'removed',
      created_at: new Date().toISOString(),
    }, ...prev])
  }

  function confirmDeleteAnchor(anchor: Anchor) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${anchor.label_en}" from your seeds? Your past logs will be kept.`)) {
        deleteAnchor(anchor.id)
      }
    } else {
      Alert.alert(
        'Remove seed',
        `Remove "${anchor.label_en}" from your seeds? Your past logs will be kept.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => deleteAnchor(anchor.id) },
        ],
      )
    }
  }

  // Build history map: anchorId → dateStr → count
  const historyMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const log of logs) {
      if (!map[log.anchor_id]) map[log.anchor_id] = {}
      map[log.anchor_id][log.log_date] = (map[log.anchor_id][log.log_date] || 0) + 1
    }
    return map
  }, [logs])

  // Week days (Mon–Sun)
  const weekDays = useMemo(() => {
    const mon = getMonday(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      return fmtDate(d)
    })
  }, [])

  // Month days (last 30 days)
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
    const stats: Record<string, { total: number; currentStreak: number; bestStreak: number; last30: number; weekTotal: number }> = {}

    for (const anchor of anchors) {
      const dateCounts = historyMap[anchor.id] || {}
      const allDates = Object.keys(dateCounts).sort()

      // Total logs
      let total = 0
      for (const c of Object.values(dateCounts)) total += c

      // Current streak: walk backward from yesterday (allow today to be 0)
      let currentStreak = 0
      const d = new Date()
      // If today has logs, count today
      if (dateCounts[fmtDate(d)]) {
        currentStreak = 1
        d.setDate(d.getDate() - 1)
      } else {
        d.setDate(d.getDate() - 1)
      }
      while (true) {
        const ds = fmtDate(d)
        if (dateCounts[ds]) {
          currentStreak++
          d.setDate(d.getDate() - 1)
        } else break
      }

      // Best streak: forward through sorted unique dates
      let bestStreak = 0
      let run = 0
      const sortedDates = [...new Set(allDates)].sort()
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          run = 1
        } else {
          const prev = new Date(sortedDates[i - 1])
          const curr = new Date(sortedDates[i])
          const diffMs = curr.getTime() - prev.getTime()
          if (diffMs <= 86400000 + 3600000) { // ~25h to handle DST
            run++
          } else {
            run = 1
          }
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
      for (const wd of weekDays) {
        weekTotal += dateCounts[wd] || 0
      }

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
      if (s && s.last30 > bestScore) {
        bestScore = s.last30
        best = a
      }
    }
    return best
  }, [anchors, anchorStats])

  // Separate anchors by type
  const growAnchors = useMemo(() => anchors.filter(a => a.type === 'grow'), [anchors])
  const letgoAnchors = useMemo(() => anchors.filter(a => a.type === 'letgo'), [anchors])

  function getMonthColor(grow: number, letgo: number): string {
    const total = grow + letgo
    if (total === 0) return '#f5f5f4'
    // Dominant type determines color family
    if (grow > letgo) {
      // Green scale
      if (total === 1) return '#bbf7d0'
      if (total <= 3) return '#6ee7b7'
      if (total <= 5) return '#34d399'
      return '#059669'
    }
    if (letgo > grow) {
      // Amber scale
      if (total === 1) return '#fde68a'
      if (total <= 3) return '#fbbf24'
      if (total <= 5) return '#f59e0b'
      return '#d97706'
    }
    // Equal mix — teal
    if (total <= 2) return '#99f6e4'
    if (total <= 4) return '#5eead4'
    return '#2dd4bf'
  }

  // Seeds logged on a specific day (for expanded panel)
  function seedsForDay(dateStr: string) {
    const result: { anchor: Anchor; count: number }[] = []
    for (const a of anchors) {
      const count = historyMap[a.id]?.[dateStr] || 0
      if (count > 0) result.push({ anchor: a, count })
    }
    return result
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                My Little Steps
              </Text>
              {anchors.length > 0 && (
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  {anchors.length} seed{anchors.length !== 1 ? 's' : ''} active
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            style={{
              width: 36, height: 36, borderRadius: 12,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: showHistory ? '#d97706' : 'rgba(0,0,0,0.05)',
            }}
          >
            <History size={18} color={showHistory ? '#ffffff' : '#4b5563'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* ===== HISTORY ===== */}
        {showHistory && (
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Recent Activity</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Last 30 days</Text>

            {activityLogs.length > 0 ? (
              <>
                {activityLogs.map(log => {
                  const Icon = ANCHOR_ICONS[log.anchor_icon] || Circle
                  const isGrow = log.anchor_type === 'grow'
                  const date = new Date(log.created_at)
                  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <View key={log.id} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: isGrow ? '#f0fdf4' : '#fffbeb',
                      marginBottom: 8,
                    }}>
                      {/* Action icon */}
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: log.action === 'added' ? '#dcfce7'
                          : log.action === 'removed' ? '#fee2e2' : '#dbeafe',
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                      }}>
                        {log.action === 'added' && <PlusCircle size={16} color="#16a34a" />}
                        {log.action === 'removed' && <MinusCircle size={16} color="#dc2626" />}
                        {log.action === 'reactivated' && <RefreshCw size={16} color="#2563eb" />}
                      </View>

                      {/* Seed info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icon size={13} color={isGrow ? '#059669' : '#d97706'} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{log.anchor_label_en}</Text>
                          <View style={{
                            paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
                            backgroundColor: isGrow ? '#dcfce7' : '#fef3c7',
                          }}>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: isGrow ? '#059669' : '#d97706' }}>
                              {isGrow ? 'Grow' : 'Let Go'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {log.action === 'added' ? 'Added' : log.action === 'removed' ? 'Removed' : 'Reactivated'}
                        </Text>
                      </View>

                      {/* Date */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151' }}>{formattedDate}</Text>
                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>{formattedTime}</Text>
                      </View>
                    </View>
                  )
                })}

                {/* Summary */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#16a34a' }}>
                      {activityLogs.filter(l => l.action === 'added').length}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>Seeds added</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#dc2626' }}>
                      {activityLogs.filter(l => l.action === 'removed').length}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>Seeds removed</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <History size={36} color="#d1d5db" />
                <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8 }}>No recent activity</Text>
                <Text style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>Add or remove seeds to see history</Text>
              </View>
            )}
          </View>
        )}

        {/* ===== THIS WEEK ===== */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>This Week</Text>

          {/* Day labels row */}
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

          {/* Grow seeds */}
          {growAnchors.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Grow</Text>
              {growAnchors.map(anchor => {
                const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                const dateCounts = historyMap[anchor.id] || {}
                const weekTotal = anchorStats[anchor.id]?.weekTotal || 0
                return (
                  <View key={anchor.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: SCREEN_WIDTH * 0.28 }}>
                      <Icon size={14} color="#059669" style={{ marginRight: 6 }} />
                      <Text numberOfLines={1} style={{ fontSize: 12, color: '#374151', flex: 1 }}>{anchor.label_en}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                      {weekDays.map((dayStr, i) => {
                        const logged = (dateCounts[dayStr] || 0) > 0
                        return (
                          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                            <View style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: logged ? '#059669' : '#d1fae5',
                              borderWidth: dayStr === today ? 2 : 0,
                              borderColor: '#047857',
                            }} />
                          </View>
                        )
                      })}
                    </View>
                    <Text style={{ width: 24, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#059669' }}>{weekTotal}</Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* Letgo seeds */}
          {letgoAnchors.length > 0 && (
            <View>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#d97706', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 }}>Let Go</Text>
              {letgoAnchors.map(anchor => {
                const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                const dateCounts = historyMap[anchor.id] || {}
                const weekTotal = anchorStats[anchor.id]?.weekTotal || 0
                return (
                  <View key={anchor.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: SCREEN_WIDTH * 0.28 }}>
                      <Icon size={14} color="#d97706" style={{ marginRight: 6 }} />
                      <Text numberOfLines={1} style={{ fontSize: 12, color: '#374151', flex: 1 }}>{anchor.label_en}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                      {weekDays.map((dayStr, i) => {
                        const logged = (dateCounts[dayStr] || 0) > 0
                        return (
                          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                            <View style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: logged ? '#d97706' : '#fef3c7',
                              borderWidth: dayStr === today ? 2 : 0,
                              borderColor: '#b45309',
                            }} />
                          </View>
                        )
                      })}
                    </View>
                    <Text style={{ width: 24, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#d97706' }}>{weekTotal}</Text>
                  </View>
                )
              })}
            </View>
          )}

          {anchors.length === 0 && (
            <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 }}>
              No seeds yet. Add some from the home screen!
            </Text>
          )}
        </View>

        {/* ===== YOUR MONTH ===== */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Your Month</Text>

          {/* 30-day pixel grid: 7 per row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {monthDays.map((dayStr) => {
              const bd = dayBreakdown[dayStr] || { grow: 0, letgo: 0 }
              const total = bd.grow + bd.letgo
              const isToday = dayStr === today
              const bgColor = getMonthColor(bd.grow, bd.letgo)
              const dayNum = parseInt(dayStr.split('-')[2], 10)
              return (
                <TouchableOpacity
                  key={dayStr}
                  onPress={() => setExpandedDay(expandedDay === dayStr ? null : dayStr)}
                  activeOpacity={0.7}
                  style={{
                    width: (SCREEN_WIDTH - 40 - 40 - 36) / 7,
                    aspectRatio: 1,
                    borderRadius: 8,
                    backgroundColor: bgColor,
                    borderWidth: isToday ? 2.5 : expandedDay === dayStr ? 2 : 0,
                    borderColor: isToday ? '#059669' : '#9ca3af',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 10,
                    fontWeight: isToday ? '700' : '500',
                    color: total >= 4 ? '#ffffff' : '#78716c',
                  }}>
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Color key */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#34d399' }} />
              <Text style={{ fontSize: 10, color: '#6b7280' }}>Grow</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#f59e0b' }} />
              <Text style={{ fontSize: 10, color: '#6b7280' }}>Let go</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#2dd4bf' }} />
              <Text style={{ fontSize: 10, color: '#6b7280' }}>Both</Text>
            </View>
          </View>

          {/* Expanded day panel */}
          {expandedDay && (
            <View style={{
              marginTop: 14,
              backgroundColor: '#faf5f0',
              borderRadius: 14,
              padding: 14,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                {new Date(expandedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              {seedsForDay(expandedDay).length > 0 ? (
                seedsForDay(expandedDay).map(({ anchor, count }) => {
                  const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                  const isGrow = anchor.type === 'grow'
                  return (
                    <View key={anchor.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: isGrow ? '#ecfdf5' : '#fef3c7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}>
                        <Icon size={14} color={isGrow ? '#059669' : '#d97706'} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{anchor.label_en}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isGrow ? '#059669' : '#d97706' }}>×{count}</Text>
                    </View>
                  )
                })
              ) : (
                <Text style={{ fontSize: 13, color: '#9ca3af' }}>No seeds logged this day</Text>
              )}
            </View>
          )}
        </View>

        {/* ===== YOUR GROWTH ===== */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}>
          {/* Title + toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Your Growth</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Last 30 days</Text>
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3 }}>
              <TouchableOpacity
                onPress={() => setGrowthView('visual')}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: growthView === 'visual' ? '#ffffff' : 'transparent',
                  shadowColor: growthView === 'visual' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: growthView === 'visual' ? 0.1 : 0,
                  shadowRadius: 2,
                  elevation: growthView === 'visual' ? 2 : 0,
                }}
              >
                <BarChart3 size={16} color={growthView === 'visual' ? '#111827' : '#9ca3af'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setGrowthView('data')}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: growthView === 'data' ? '#ffffff' : 'transparent',
                  shadowColor: growthView === 'data' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: growthView === 'data' ? 0.1 : 0,
                  shadowRadius: 2,
                  elevation: growthView === 'data' ? 2 : 0,
                }}
              >
                <Hash size={16} color={growthView === 'data' ? '#111827' : '#9ca3af'} />
              </TouchableOpacity>
            </View>
          </View>

          {growthView === 'visual' ? (
            /* ---- VISUAL VIEW: mini bar charts ---- */
            <View>
              {anchors.map(anchor => {
                const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                const isGrow = anchor.type === 'grow'
                const stats = anchorStats[anchor.id]
                if (!stats) return null
                const dateCounts = historyMap[anchor.id] || {}
                const accent = isGrow ? '#059669' : '#d97706'
                const bgTint = isGrow ? '#f0fdf4' : '#fffbeb'
                const barEmpty = isGrow ? '#dcfce7' : '#fef3c7'
                // Find max daily count for this anchor to scale bars
                let maxCount = 1
                for (const day of monthDays) {
                  const c = dateCounts[day] || 0
                  if (c > maxCount) maxCount = c
                }
                return (
                  <View key={anchor.id} style={{
                    backgroundColor: bgTint,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                  }}>
                    {/* Seed name + streak badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: isGrow ? '#dcfce7' : '#fef3c7',
                        alignItems: 'center', justifyContent: 'center', marginRight: 8,
                      }}>
                        <Icon size={13} color={accent} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 }}>
                        {anchor.label_en}
                      </Text>
                      {stats.currentStreak > 0 && (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center',
                          backgroundColor: isGrow ? '#dcfce7' : '#fef3c7',
                          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 3,
                        }}>
                          <Text style={{ fontSize: 12 }}>🔥</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: accent }}>{stats.currentStreak}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => confirmDeleteAnchor(anchor)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 8, padding: 4 }}
                      >
                        <Trash2 size={14} color="#d1d5db" />
                      </TouchableOpacity>
                    </View>

                    {/* 30-day mini bar chart */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 1.5 }}>
                      {monthDays.map(day => {
                        const count = dateCounts[day] || 0
                        const height = count > 0 ? Math.max(4, (count / maxCount) * 32) : 2
                        const isT = day === today
                        return (
                          <View
                            key={day}
                            style={{
                              flex: 1,
                              height,
                              borderRadius: 2,
                              backgroundColor: count > 0 ? accent : barEmpty,
                              opacity: count > 0 ? (isT ? 1 : 0.7 + (count / maxCount) * 0.3) : 0.5,
                            }}
                          />
                        )
                      })}
                    </View>

                    {/* Summary line */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>
                        {stats.last30}/30 days
                      </Text>
                      <View style={{ width: 1, height: 10, backgroundColor: isGrow ? '#bbf7d0' : '#fde68a' }} />
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>
                        Best: {stats.bestStreak}d
                      </Text>
                      <View style={{ width: 1, height: 10, backgroundColor: isGrow ? '#bbf7d0' : '#fde68a' }} />
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>
                        Total: {stats.total}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            /* ---- DATA VIEW: compact table ---- */
            <View>
              {/* Column headers */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingRight: 2 }}>
                <View style={{ flex: 1 }} />
                <Text style={{ width: 40, fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Streak</Text>
                <Text style={{ width: 40, fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Best</Text>
                <Text style={{ width: 72, fontSize: 10, color: '#9ca3af', textAlign: 'right' }}>Strength</Text>
              </View>

              {anchors.map(anchor => {
                const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                const isGrow = anchor.type === 'grow'
                const stats = anchorStats[anchor.id]
                if (!stats) return null
                const strengthPct = Math.round((stats.last30 / 30) * 100)
                const accent = isGrow ? '#059669' : '#d97706'
                const bgTint = isGrow ? '#dcfce7' : '#fef3c7'

                return (
                  <View key={anchor.id} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                  }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 30, height: 30, borderRadius: 15,
                        backgroundColor: bgTint,
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                      }}>
                        <Icon size={14} color={accent} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 13, color: '#374151', flex: 1 }}>{anchor.label_en}</Text>
                    </View>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: accent }}>{stats.currentStreak}</Text>
                    </View>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#9ca3af' }}>{stats.bestStreak}</Text>
                    </View>
                    <View style={{ width: 72, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#f3f4f6' }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${strengthPct}%`, backgroundColor: accent }} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: accent, width: 28, textAlign: 'right' }}>{stats.last30}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDeleteAnchor(anchor)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <Trash2 size={14} color="#d1d5db" />
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}

          {/* Most consistent callout */}
          {mostConsistent && anchorStats[mostConsistent.id]?.last30 > 0 && (
            <View style={{
              marginTop: 16,
              backgroundColor: '#ecfdf5',
              borderRadius: 12,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Trophy size={16} color="#059669" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, color: '#374151', flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#059669' }}>Most consistent: </Text>
                {mostConsistent.label_en} — {anchorStats[mostConsistent.id].last30}/30 days
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
