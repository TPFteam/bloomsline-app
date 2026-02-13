import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useRouter } from 'expo-router'
import Svg, { Line } from 'react-native-svg'
import {
  Bell,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  ZoomIn,
  ZoomOut,
  Plus,
  Sun,
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
  Play,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Anchor icon mapping (same as Next.js app)
const ANCHOR_ICONS: Record<string, any> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookOpen, brain: Brain,
  bed: Bed, apple: Apple, meditation: Circle, walk: Footprints,
  social: Users, heart: Heart, sprout: Sparkles, journal: PenLine,
  gratitude: Sparkles, nature: TreePine, creativity: Palette,
  breathing: Wind, stretch: Sparkles, vegetables: Sparkles, music: Music,
  cigarette: Cigarette, wine: Wine, coffee: Coffee, cookie: Cookie,
  smartphone: Smartphone, tv: Tv, candy: Candy, junkfood: Pizza,
}

type Anchor = {
  id: string
  anchor_id?: string
  icon: string
  label_en: string
  label_fr: string
  type: 'grow' | 'letgo'
}

type MomentItem = {
  id: string
  created_at: string
  moods: string[] | null
  type: string
  caption: string | null
  media_url: string | null
}

export default function HomeScreen() {
  const { user, member } = useAuth()
  const router = useRouter()
  const [moments, setMoments] = useState<MomentItem[]>([])
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [anchorLogs, setAnchorLogs] = useState<Record<string, number>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState(1)
  const [centerHour, setCenterHour] = useState(12)
  const [currentTime, setCurrentTime] = useState(new Date())

  const firstName = member?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || 'Friend'
  const totalSeedLogs = Object.values(anchorLogs).reduce((sum, c) => sum + c, 0)

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = useCallback(async () => {
    if (!member?.id || !user?.id) return

    const dayStart = new Date(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDate)
    dayEnd.setHours(23, 59, 59, 999)
    // Use local date string for log_date (YYYY-MM-DD) to avoid UTC shift
    const y = dayStart.getFullYear()
    const mo = String(dayStart.getMonth() + 1).padStart(2, '0')
    const d = String(dayStart.getDate()).padStart(2, '0')
    const dateStr = `${y}-${mo}-${d}`

    const [momentsRes, anchorsRes, logsRes] = await Promise.all([
      supabase
        .from('moments')
        .select('id, created_at, moods, type, caption, media_url')
        .eq('user_id', user.id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('member_anchors')
        .select('id, icon, label_en, label_fr, type')
        .eq('member_id', member.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('anchor_logs')
        .select('anchor_id')
        .eq('member_id', member.id)
        .eq('log_date', dateStr),
    ])

    setMoments((momentsRes.data ?? []) as MomentItem[])
    setAnchors((anchorsRes.data ?? []) as Anchor[])

    const counts: Record<string, number> = {}
    ;(logsRes.data ?? []).forEach((l: any) => {
      counts[l.anchor_id] = (counts[l.anchor_id] || 0) + 1
    })
    setAnchorLogs(counts)
    setLoading(false)
  }, [member?.id, user?.id, selectedDate])

  useFocusEffect(useCallback(() => { fetchData() }, [fetchData]))

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  async function logAnchor(anchorId: string) {
    if (!member?.id) return
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setAnchorLogs(prev => ({ ...prev, [anchorId]: (prev[anchorId] || 0) + 1 }))
    await supabase.from('anchor_logs').insert({
      member_id: member.id,
      anchor_id: anchorId,
      logged_at: now.toISOString(),
      log_date: localDate,
    })
  }

  // Zoom helpers
  const getVisibleHours = () => [24, 12, 8, 6][zoomLevel - 1] || 24
  const getVisibleRange = () => {
    const h = getVisibleHours()
    let s = centerHour - h / 2
    let e = centerHour + h / 2
    if (s < 0) { s = 0; e = h }
    if (e > 24) { e = 24; s = 24 - h }
    return { startHour: s, endHour: e }
  }
  const hourToPosition = (hour: number) => {
    const { startHour, endHour } = getVisibleRange()
    return ((hour - startHour) / (endHour - startHour)) * 100
  }

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning,'
    if (h < 18) return 'Good afternoon,'
    return 'Good evening,'
  }

  function getMotivation() {
    const msgs = ["You're doing great", 'Every step counts', 'This moment is yours', 'Take care of yourself']
    return msgs[Math.floor(Math.random() * msgs.length)]
  }

  const isToday = () => {
    const t = new Date(); t.setHours(0,0,0,0)
    const s = new Date(selectedDate); s.setHours(0,0,0,0)
    return t.getTime() === s.getTime()
  }

  const goToPrevDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    setSelectedDate(prev)
  }

  const goToNextDay = () => {
    if (isToday()) return
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    setSelectedDate(next)
  }

  const formatDateLabel = () => {
    if (isToday()) return 'Today'
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0,0,0,0)
    const s = new Date(selectedDate); s.setHours(0,0,0,0)
    if (yesterday.getTime() === s.getTime()) return 'Yesterday'
    return selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Current time position for the green line
  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
  const timePosition = hourToPosition(currentHour)
  const flowWidth = SCREEN_WIDTH - 80 // padding

  if (loading) {
    return (
      <LinearGradient colors={['#ecfdf5', '#f0fdfa', '#fafafa']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={['#ecfdf5', '#f0fdfa', '#fafafa']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        >
          {/* ===== HEADER ===== */}
          <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827', lineHeight: 34 }}>
                  {getGreeting()}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827', lineHeight: 34 }}>
                  {firstName}!
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>{getMotivation()}</Text>
                  <Clock size={14} color="#10b981" />
                </View>
              </View>
              <TouchableOpacity style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.8)',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#059669', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
              }}>
                <Bell size={20} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 20, marginTop: 16 }}>

            {/* ===== YOUR DAY ===== */}
            {(moments.length > 0 || totalSeedLogs > 0) && (!isToday() || currentTime.getHours() >= 18) && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({
                  pathname: '/daily-story',
                  params: { date: selectedDate.toISOString() },
                })}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#ec4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 24,
                    padding: 20,
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Heart size={22} color="#ffffff" fill="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff' }}>Your Day</Text>
                        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                          {moments.length} moment{moments.length !== 1 ? 's' : ''}
                          {totalSeedLogs > 0 ? ` · ${totalSeedLogs} seed${totalSeedLogs !== 1 ? 's' : ''}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Play size={18} color="#ffffff" fill="#ffffff" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* ===== TODAY'S FLOW ===== */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.6)',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            }}>
              {/* Flow header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Today's Flow</Text>
                  <TouchableOpacity style={{ padding: 2 }}>
                    <Info size={14} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TouchableOpacity onPress={goToPrevDay} style={{ padding: 4 }}>
                    <ChevronLeft size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#4b5563', minWidth: 60, textAlign: 'center' }}>
                    {formatDateLabel()}
                  </Text>
                  <TouchableOpacity onPress={goToNextDay} style={{ padding: 4, opacity: isToday() ? 0.3 : 1 }}>
                    <ChevronRight size={16} color={isToday() ? '#9ca3af' : '#6b7280'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Timeline visualization */}
              <View style={{
                height: 160,
                backgroundColor: 'rgba(236, 253, 245, 0.5)',
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Grid lines */}
                <View style={{ position: 'absolute', left: 0, right: 0, top: '25%', height: 1, backgroundColor: 'rgba(167, 243, 208, 0.3)' }} />
                <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(167, 243, 208, 0.5)' }} />
                <View style={{ position: 'absolute', left: 0, right: 0, top: '75%', height: 1, backgroundColor: 'rgba(167, 243, 208, 0.3)' }} />

                {/* Current time indicator */}
                {isToday() && timePosition >= 0 && timePosition <= 100 && (
                  <View style={{
                    position: 'absolute',
                    left: `${timePosition}%`,
                    top: 0, bottom: 0, width: 1,
                    backgroundColor: 'rgba(16, 185, 129, 0.4)',
                  }}>
                    <View style={{
                      position: 'absolute', top: 0,
                      left: -3, width: 7, height: 7,
                      borderRadius: 4, backgroundColor: '#10b981',
                    }} />
                  </View>
                )}

                {/* Future fade overlay */}
                {isToday() && timePosition > 0 && timePosition < 100 && (
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.95)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      left: `${timePosition}%`,
                      right: 0, top: 0, bottom: 0,
                    }}
                  />
                )}

                {/* Moment orbs on timeline */}
                {moments.length > 0 ? (
                  moments.map((m) => {
                    const t = new Date(m.created_at)
                    const h = t.getHours() + t.getMinutes() / 60
                    const x = hourToPosition(h)
                    if (x < -5 || x > 105) return null

                    // Y position based on mood score
                    const score = m.moods?.[0] ? getMoodScore(m.moods[0]) : 60
                    const y = 100 - ((score / 100) * 70 + 15)
                    const colors = getMoodColors(m.moods?.[0])

                    const isPhoto = m.type === 'photo' && m.media_url

                    return (
                      <View
                        key={m.id}
                        style={{
                          position: 'absolute',
                          left: `${x}%`, top: `${y}%`,
                          marginLeft: isPhoto ? -16 : -16,
                          marginTop: isPhoto ? -20 : -16,
                        }}
                      >
                        {isPhoto ? (
                          <View style={{
                            width: 32, height: 40, borderRadius: 8,
                            overflow: 'hidden',
                            borderWidth: 2, borderColor: '#ffffff',
                            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
                          }}>
                            <Image
                              source={{ uri: m.media_url! }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          </View>
                        ) : (
                          <LinearGradient
                            colors={[colors.from, colors.to]}
                            style={{
                              width: 32, height: 32, borderRadius: 16,
                              alignItems: 'center', justifyContent: 'center',
                              borderWidth: 2, borderColor: '#ffffff',
                              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
                            }}
                          >
                            <MoodIcon mood={m.moods?.[0]} />
                          </LinearGradient>
                        )}
                      </View>
                    )
                  })
                ) : (
                  /* Empty state */
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: '#f3f4f6',
                      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                    }}>
                      <Sun size={24} color="#d1d5db" />
                    </View>
                    <Text style={{ fontSize: 14, color: '#9ca3af' }}>No moments yet</Text>
                    <Text style={{ fontSize: 12, color: '#d1d5db', marginTop: 2 }}>Capture your first moment</Text>
                  </View>
                )}

                {/* Moment connecting line */}
                {moments.length > 1 && (
                  <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}>
                    {moments.slice(0, -1).map((m, i) => {
                      const next = moments[i + 1]!
                      const t1 = new Date(m.created_at)
                      const t2 = new Date(next.created_at)
                      const x1 = (hourToPosition(t1.getHours() + t1.getMinutes() / 60) / 100) * flowWidth
                      const x2 = (hourToPosition(t2.getHours() + t2.getMinutes() / 60) / 100) * flowWidth
                      const s1 = m.moods?.[0] ? getMoodScore(m.moods[0]) : 60
                      const s2 = next.moods?.[0] ? getMoodScore(next.moods[0]) : 60
                      const y1 = (1 - ((s1 / 100) * 0.7 + 0.15)) * 160
                      const y2 = (1 - ((s2 / 100) * 0.7 + 0.15)) * 160
                      return (
                        <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="#10b981" strokeWidth={2} opacity={0.5} />
                      )
                    })}
                  </Svg>
                )}
              </View>

              {/* Time labels */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
                {zoomLevel === 1 ? (
                  <>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>Morning</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>Afternoon</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>Evening</Text>
                  </>
                ) : (
                  (() => {
                    const { startHour, endHour } = getVisibleRange()
                    const range = endHour - startHour
                    const step = range / 4
                    return Array.from({ length: 5 }).map((_, i) => {
                      const h = Math.floor(startHour + i * step)
                      const p = h >= 12 ? 'PM' : 'AM'
                      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                      return <Text key={i} style={{ fontSize: 11, color: '#9ca3af' }}>{h12}{p}</Text>
                    })
                  })()
                )}
              </View>

              {/* Controls row */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6',
              }}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                  <Text style={{ fontSize: 13, color: '#9ca3af' }}>Wanna talk?</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: 'rgba(236, 253, 245, 0.5)', borderRadius: 20,
                    paddingHorizontal: 8, paddingVertical: 4,
                  }}>
                    <TouchableOpacity
                      onPress={() => zoomLevel > 1 && setZoomLevel(z => z - 1)}
                      style={{ opacity: zoomLevel <= 1 ? 0.3 : 1 }}
                    >
                      <ZoomOut size={14} color="#6b7280" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '500', minWidth: 24, textAlign: 'center' }}>
                      {getVisibleHours()}h
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (zoomLevel < 4) {
                          setZoomLevel(z => z + 1)
                          if (isToday()) setCenterHour(currentHour)
                        }
                      }}
                      style={{ opacity: zoomLevel >= 4 ? 0.3 : 1 }}
                    >
                      <ZoomIn size={14} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== MY LITTLE STEPS (SEEDS) ===== */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.6)',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <LinearGradient
                    colors={['#fbbf24', '#f97316']}
                    style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Sparkles size={16} color="#ffffff" />
                  </LinearGradient>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>My Little Steps</Text>
                </View>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#d97706' }}>View all</Text>
                  <ChevronRight size={14} color="#d97706" />
                </TouchableOpacity>
              </View>

              {/* Seeds grid - 4 columns */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {anchors.map((anchor) => {
                  const count = anchorLogs[anchor.id] ?? 0
                  const isGrow = anchor.type === 'grow'
                  const IconComponent = ANCHOR_ICONS[anchor.icon] || Circle

                  return (
                    <TouchableOpacity
                      key={anchor.id}
                      onPress={() => logAnchor(anchor.id)}
                      activeOpacity={0.7}
                      style={{
                        width: '23%',
                        aspectRatio: 1,
                        borderRadius: 16,
                        backgroundColor: isGrow ? '#ecfdf5' : '#fef3c7',
                        borderWidth: 2,
                        borderColor: isGrow ? '#a7f3d0' : '#fde68a',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <IconComponent size={24} color={isGrow ? '#059669' : '#d97706'} style={{ marginBottom: 4 }} />
                      <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '500', textAlign: 'center', paddingHorizontal: 2 }} numberOfLines={1}>
                        {anchor.label_en}
                      </Text>
                      {count > 0 && (
                        <View style={{
                          position: 'absolute', top: -5, right: -5,
                          backgroundColor: isGrow ? '#059669' : '#fbbf24',
                          borderRadius: 10, minWidth: 20, height: 20,
                          alignItems: 'center', justifyContent: 'center',
                          paddingHorizontal: 4,
                        }}>
                          <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: '700' }}>{count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}

                {/* Add button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{
                    width: '23%',
                    aspectRatio: 1,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: '#fde68a',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={24} color="#d97706" />
                </TouchableOpacity>
              </View>

              {/* Hint text */}
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 12 }}>
                {anchors.length > 0 ? 'Tap to log' : 'Add anchors to track'}
              </Text>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}

// ===== Mood helpers =====

const MOOD_SCORES: Record<string, number> = {
  grateful: 90, joyful: 95, inspired: 85, loved: 92,
  peaceful: 80, calm: 75, hopeful: 78, proud: 88,
  overwhelmed: 35, tired: 40, uncertain: 45, tender: 50,
  restless: 42, heavy: 32,
}

const MOOD_COLORS: Record<string, { from: string; to: string }> = {
  grateful: { from: '#34d399', to: '#10b981' },
  joyful: { from: '#fbbf24', to: '#f59e0b' },
  inspired: { from: '#a78bfa', to: '#8b5cf6' },
  loved: { from: '#fb7185', to: '#f43f5e' },
  peaceful: { from: '#22d3ee', to: '#06b6d4' },
  calm: { from: '#60a5fa', to: '#3b82f6' },
  hopeful: { from: '#facc15', to: '#eab308' },
  proud: { from: '#fb923c', to: '#f97316' },
  overwhelmed: { from: '#94a3b8', to: '#64748b' },
  tired: { from: '#a5b4fc', to: '#818cf8' },
  uncertain: { from: '#cbd5e1', to: '#94a3b8' },
  tender: { from: '#fda4af', to: '#fb7185' },
  restless: { from: '#c4b5fd', to: '#a78bfa' },
  heavy: { from: '#9ca3af', to: '#6b7280' },
}

function getMoodScore(mood: string): number {
  return MOOD_SCORES[mood] ?? 60
}

function getMoodColors(mood?: string | null): { from: string; to: string } {
  if (!mood) return { from: '#e5e7eb', to: '#d1d5db' }
  return MOOD_COLORS[mood] ?? { from: '#e5e7eb', to: '#d1d5db' }
}

function MoodIcon({ mood }: { mood?: string | null }) {
  const ICONS: Record<string, any> = {
    grateful: Heart, joyful: Sun, inspired: Sparkles, loved: Heart,
    peaceful: Circle, calm: Circle, hopeful: Sparkles, proud: Sparkles,
  }
  const Icon = mood ? ICONS[mood] || Sun : Sun
  return <Icon size={14} color="#ffffff" strokeWidth={2.5} />
}
