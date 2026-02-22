import { useState, useEffect, useCallback, useRef, createElement } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { createAudioPlayer } from 'expo-audio'
import { Video as AVVideo, ResizeMode } from 'expo-av'
import {
  X,
  Camera,
  Video as VideoIcon,
  Mic,
  PenLine,
  Heart,
  Sun,
  Moon,
  Sparkles,
  Play,
  Pause,
  Leaf,
  CheckCircle,
  Clock,
} from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const { width: SW, height: SH } = Dimensions.get('window')
const SLIDE_DURATION = 5000

// ============================================
// TYPES
// ============================================
interface MomentMediaItem {
  id: string
  moment_id: string
  media_url: string
  mime_type: string
  sort_order: number
}

interface Moment {
  id: string
  type: string
  media_url: string | null
  text_content: string | null
  caption: string | null
  created_at: string
  moods: string[] | null
  media_items?: MomentMediaItem[]
}

interface SeedLog {
  anchor_id: string
  label: string
  type: 'grow' | 'letgo'
}

interface RitualLog {
  id: string
  name: string
  icon: string
  duration_minutes: number | null
  completed_at: string
}

interface StorySlide {
  kind: 'intro' | 'moment' | 'rituals' | 'seeds' | 'outro'
  data?: Moment | SeedLog[] | RitualLog[]
  // For multi-media moments, override the displayed media
  mediaOverride?: { url: string; mimeType: string }
}

// ============================================
// MAIN COMPONENT
// ============================================
function StaggeredIntro({ momentsCount, seedsCount, ritualsCount }: { momentsCount: number; seedsCount: number; ritualsCount: number }) {
  const icon = useRef(new Animated.Value(0)).current
  const title = useRef(new Animated.Value(0)).current
  const sub = useRef(new Animated.Value(0)).current
  const hint = useRef(new Animated.Value(0)).current
  const iconScale = useRef(new Animated.Value(0.5)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(icon, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      Animated.timing(title, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sub, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(hint, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()

    // Gentle pulse on icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const isEvening = new Date().getHours() >= 18
  const IconComp = isEvening ? Moon : Sun

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: icon, transform: [{ scale: Animated.multiply(iconScale, pulse) }], marginBottom: 24 }}>
        <LinearGradient
          colors={['#4A9A86', '#5AB39C']}
          style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <IconComp size={42} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.Text style={{ opacity: title, fontSize: 32, fontWeight: '700', color: '#fff', marginBottom: 8, transform: [{ translateY: Animated.multiply(Animated.subtract(1, title), 12) }] }}>
        Your Day
      </Animated.Text>

      <Animated.Text style={{ opacity: sub, fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
        {[
          momentsCount > 0 ? `${momentsCount} moment${momentsCount !== 1 ? 's' : ''}` : null,
          ritualsCount > 0 ? `${ritualsCount} ritual${ritualsCount !== 1 ? 's' : ''}` : null,
          seedsCount > 0 ? `${seedsCount} seed${seedsCount !== 1 ? 's' : ''}` : null,
        ].filter(Boolean).join(' \u00B7 ') || 'Your day'}
      </Animated.Text>

      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 36, opacity: Animated.multiply(hint, 0.5) }}>
        <Sparkles size={16} color="#fff" />
        <Text style={{ fontSize: 13, color: '#fff' }}>Here's what you felt today</Text>
      </Animated.View>
    </View>
  )
}

function StaggeredSeeds({ seeds }: { seeds: SeedLog[] }) {
  const grow = seeds.filter(s => s.type === 'grow')
  const letgo = seeds.filter(s => s.type === 'letgo')
  const allItems = [...grow, ...letgo]

  const icon = useRef(new Animated.Value(0)).current
  const title = useRef(new Animated.Value(0)).current
  const iconScale = useRef(new Animated.Value(0.5)).current
  const itemAnims = useRef(allItems.map(() => new Animated.Value(0))).current

  useEffect(() => {
    // Icon + title first
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(icon, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      Animated.timing(title, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      // Then each seed item staggers in
      Animated.stagger(120, itemAnims.map(a =>
        Animated.spring(a, { toValue: 1, friction: 12, tension: 50, useNativeDriver: true })
      )).start()
    })
  }, [])

  let itemIdx = 0

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: icon, transform: [{ scale: iconScale }], marginBottom: 24 }}>
        <LinearGradient
          colors={['#fbbf24', '#f59e0b']}
          style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Leaf size={36} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.Text style={{ opacity: title, fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 24, transform: [{ translateY: Animated.multiply(Animated.subtract(1, title), 10) }] }}>
        Your Little Steps
      </Animated.Text>

      {grow.length > 0 && (
        <View style={{
          backgroundColor: 'rgba(74,154,134,0.2)', borderRadius: 16,
          padding: 16, width: '100%', maxWidth: 300, marginBottom: 12,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#5AB39C', marginBottom: 8 }}>
            Keep ({grow.length})
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {grow.slice(0, 5).map((s, i) => {
              const anim = itemAnims[itemIdx++]
              return (
                <Animated.View key={i} style={{
                  opacity: anim,
                  transform: [{ scale: anim || 0 }, { translateY: Animated.multiply(Animated.subtract(1, anim || new Animated.Value(1)), 8) }],
                  paddingHorizontal: 12, paddingVertical: 6,
                  backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999,
                }}>
                  <Text style={{ fontSize: 13, color: '#fff' }}>{s.label}</Text>
                </Animated.View>
              )
            })}
          </View>
        </View>
      )}

      {letgo.length > 0 && (
        <View style={{
          backgroundColor: 'rgba(212,133,106,0.2)', borderRadius: 16,
          padding: 16, width: '100%', maxWidth: 300,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#E8A87C', marginBottom: 8 }}>
            Lighten ({letgo.length})
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {letgo.slice(0, 5).map((s, i) => {
              const anim = itemAnims[itemIdx++]
              return (
                <Animated.View key={i} style={{
                  opacity: anim,
                  transform: [{ scale: anim || 0 }, { translateY: Animated.multiply(Animated.subtract(1, anim || new Animated.Value(1)), 8) }],
                  paddingHorizontal: 12, paddingVertical: 6,
                  backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999,
                }}>
                  <Text style={{ fontSize: 13, color: '#fff' }}>{s.label}</Text>
                </Animated.View>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

function StaggeredRituals({ rituals }: { rituals: RitualLog[] }) {
  const icon = useRef(new Animated.Value(0)).current
  const title = useRef(new Animated.Value(0)).current
  const sub = useRef(new Animated.Value(0)).current
  const iconScale = useRef(new Animated.Value(0.5)).current
  const itemAnims = useRef(rituals.map(() => new Animated.Value(0))).current
  const checkAnims = useRef(rituals.map(() => new Animated.Value(0))).current

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(icon, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      Animated.timing(title, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sub, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      // Each ritual card staggers in
      Animated.stagger(120, itemAnims.map(a =>
        Animated.spring(a, { toValue: 1, friction: 12, tension: 50, useNativeDriver: true })
      )).start(() => {
        // Checkmarks pop in after cards
        Animated.stagger(100, checkAnims.map(a =>
          Animated.spring(a, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true })
        )).start()
      })
    })
  }, [])

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
      <Animated.View style={{ opacity: icon, transform: [{ scale: iconScale }], marginBottom: 24 }}>
        <LinearGradient
          colors={['#14b8a6', '#10b981']}
          style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <CheckCircle size={36} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.Text style={{ opacity: title, fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6, transform: [{ translateY: Animated.multiply(Animated.subtract(1, title), 10) }] }}>
        Your Rituals
      </Animated.Text>

      <Animated.Text style={{ opacity: sub, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
        {rituals.length} ritual{rituals.length !== 1 ? 's' : ''} completed today
      </Animated.Text>

      <View style={{ width: '100%', maxWidth: 320, gap: 12 }}>
        {rituals.slice(0, 5).map((ritual, i) => {
          const anim = itemAnims[i]
          const check = checkAnims[i]
          const dur = formatDuration(ritual.duration_minutes)
          return (
            <Animated.View key={ritual.id} style={{
              opacity: anim,
              transform: [
                { translateX: Animated.multiply(Animated.subtract(1, anim), -20) },
              ],
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 14,
              gap: 12,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Heart size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{ritual.name}</Text>
                {dur && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={11} color="rgba(255,255,255,0.5)" />
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{dur}</Text>
                  </View>
                )}
              </View>
              <Animated.View style={{
                opacity: check,
                transform: [{ scale: check }],
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Heart size={14} color="#fff" fill="#fff" />
              </Animated.View>
            </Animated.View>
          )
        })}
      </View>
    </View>
  )
}

function StaggeredOutro() {
  const icon = useRef(new Animated.Value(0)).current
  const title = useRef(new Animated.Value(0)).current
  const sub = useRef(new Animated.Value(0)).current
  const hint = useRef(new Animated.Value(0)).current
  const iconScale = useRef(new Animated.Value(0.5)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.stagger(250, [
      Animated.parallel([
        Animated.timing(icon, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, friction: 8, tension: 30, useNativeDriver: true }),
      ]),
      Animated.timing(title, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sub, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(hint, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()

    // Warm heartbeat pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
      <Animated.View style={{ opacity: icon, transform: [{ scale: Animated.multiply(iconScale, pulse) }], marginBottom: 28 }}>
        <LinearGradient
          colors={['#ec4899', '#f43f5e']}
          style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Heart size={40} color="#fff" fill="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.Text style={{ opacity: title, fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 10, transform: [{ translateY: Animated.multiply(Animated.subtract(1, title), 12) }] }}>
        Well done, beautiful
      </Animated.Text>

      <Animated.Text style={{ opacity: sub, fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 24 }}>
        Every feeling you noticed today{'\n'}made you a little stronger.
      </Animated.Text>

      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 36, opacity: Animated.multiply(hint, 0.4) }}>
        <Heart size={14} color="#fff" fill="#fff" />
        <Text style={{ fontSize: 13, color: '#fff' }}>See you tomorrow</Text>
      </Animated.View>
    </View>
  )
}

export default function DailyStoryScreen() {
  const router = useRouter()
  const { user, member } = useAuth()
  const params = useLocalSearchParams<{ date?: string }>()

  const [slides, setSlides] = useState<StorySlide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.92)).current
  const slideYAnim = useRef(new Animated.Value(20)).current

  // Soft slide transitions — gentle fade + lift + breathe in
  useEffect(() => {
    fadeAnim.setValue(0)
    scaleAnim.setValue(0.92)
    slideYAnim.setValue(20)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 20, tension: 40, useNativeDriver: true,
      }),
      Animated.timing(slideYAnim, {
        toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start()
  }, [currentIndex])

  // Fetch data for the story
  useEffect(() => {
    if (!user?.id || !member?.id) return

    async function load() {
      // Use the passed date or current date — always work in local time
      const baseDate = params.date ? new Date(params.date) : new Date()
      const dayStart = new Date(baseDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(baseDate)
      dayEnd.setHours(23, 59, 59, 999)

      const y = dayStart.getFullYear()
      const mo = String(dayStart.getMonth() + 1).padStart(2, '0')
      const d = String(dayStart.getDate()).padStart(2, '0')
      const localDate = `${y}-${mo}-${d}`

      const [momentsRes, logsRes, ritualsRes] = await Promise.all([
        supabase
          .from('moments')
          .select('id, type, media_url, text_content, caption, created_at, moods')
          .eq('user_id', user!.id)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('anchor_logs')
          .select('anchor_id, member_anchors(label_en, type)')
          .eq('member_id', member!.id)
          .eq('log_date', localDate),
        supabase
          .from('ritual_completions')
          .select('id, ritual_id, duration_minutes, created_at, completed, rituals(name, icon)')
          .eq('member_id', member!.id)
          .eq('completion_date', localDate)
          .eq('completed', true),
      ])

      const moments = (momentsRes.data ?? []) as Moment[]

      // Fetch moment_media for multi-media moments
      if (moments.length > 0) {
        const momentIds = moments.map(m => m.id)
        const { data: mediaData } = await supabase
          .from('moment_media')
          .select('id, moment_id, media_url, mime_type, sort_order')
          .in('moment_id', momentIds)
          .order('sort_order', { ascending: true })

        if (mediaData) {
          const mediaByMoment = new Map<string, MomentMediaItem[]>()
          for (const row of mediaData as MomentMediaItem[]) {
            if (!mediaByMoment.has(row.moment_id)) mediaByMoment.set(row.moment_id, [])
            mediaByMoment.get(row.moment_id)!.push(row)
          }
          for (const m of moments) {
            m.media_items = mediaByMoment.get(m.id) || []
          }
        }
      }

      const seedLogs: SeedLog[] = (logsRes.data ?? []).map((l: any) => ({
        anchor_id: l.anchor_id,
        label: l.member_anchors?.label_en || 'Seed',
        type: (l.member_anchors?.type || 'grow') as 'grow' | 'letgo',
      }))
      const ritualLogs: RitualLog[] = (ritualsRes.data ?? []).map((r: any) => ({
        id: r.id,
        name: r.rituals?.name || 'Ritual',
        icon: r.rituals?.icon || 'heart',
        duration_minutes: r.duration_minutes,
        completed_at: r.created_at,
      }))

      // Build slides — expand multi-media moments into individual slides
      const momentSlides: StorySlide[] = []
      for (const m of moments) {
        if (m.media_items && m.media_items.length > 1) {
          // Each media item becomes its own story slide
          for (const mi of m.media_items) {
            momentSlides.push({
              kind: 'moment',
              data: m,
              mediaOverride: { url: mi.media_url, mimeType: mi.mime_type },
            })
          }
        } else {
          momentSlides.push({ kind: 'moment', data: m })
        }
      }

      const builtSlides: StorySlide[] = [
        { kind: 'intro' },
        ...momentSlides,
        ...(ritualLogs.length > 0 ? [{ kind: 'rituals' as const, data: ritualLogs }] : []),
        ...(seedLogs.length > 0 ? [{ kind: 'seeds' as const, data: seedLogs }] : []),
        { kind: 'outro' },
      ]

      setSlides(builtSlides)
      setLoading(false)
    }

    load()
  }, [user?.id, member?.id, params.date])

  // Auto-advance timer
  useEffect(() => {
    if (isPaused || loading || slides.length === 0) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < slides.length - 1) {
            setCurrentIndex(i => i + 1)
            return 0
          } else {
            router.back()
            return 100
          }
        }
        return prev + (100 / (SLIDE_DURATION / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [currentIndex, slides.length, isPaused, loading])

  // Reset progress on slide change
  useEffect(() => {
    setProgress(0)
  }, [currentIndex])

  // Cleanup
  useEffect(() => {
    return () => {
      if (playerRef.current) playerRef.current.release()
    }
  }, [])

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(i => i + 1)
      setProgress(0)
    } else {
      router.back()
    }
  }, [currentIndex, slides.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
      setProgress(0)
    }
  }, [currentIndex])

  const handleTap = (x: number) => {
    if (x < SW / 3) {
      goPrev()
    } else {
      goNext()
    }
  }

  if (loading || slides.length === 0) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />
  }

  const slide = slides[currentIndex]
  const momentsCount = slides.filter(s => s.kind === 'moment').length
  const seedsSlide = slides.find(s => s.kind === 'seeds')
  const seedsCount = seedsSlide ? (seedsSlide.data as SeedLog[]).length : 0
  const ritualsSlide = slides.find(s => s.kind === 'rituals')
  const ritualsCount = ritualsSlide ? (ritualsSlide.data as RitualLog[]).length : 0

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Progress bars */}
      <View style={{
        position: 'absolute', top: Platform.OS === 'ios' ? 54 : 24,
        left: 0, right: 0, zIndex: 50,
        flexDirection: 'row', gap: 3, paddingHorizontal: 12,
      }}>
        {slides.map((_, i) => (
          <View key={i} style={{
            flex: 1, height: 2, borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden',
          }}>
            <View style={{
              height: '100%', borderRadius: 1,
              backgroundColor: '#fff',
              width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
            }} />
          </View>
        ))}
      </View>

      {/* Close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute', top: Platform.OS === 'ios' ? 68 : 36,
          right: 16, zIndex: 50,
          width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={24} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>

      {/* Tap zones */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => handleTap(e.nativeEvent.locationX)}
        onPressIn={() => setIsPaused(true)}
        onPressOut={() => setIsPaused(false)}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Animated.View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideYAnim }] }}>
        {/* INTRO SLIDE */}
        {slide.kind === 'intro' && (
          <StaggeredIntro momentsCount={momentsCount} seedsCount={seedsCount} ritualsCount={ritualsCount} />
        )}

        {/* MOMENT SLIDE */}
        {slide.kind === 'moment' && (() => {
          const m = slide.data as Moment
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

          // Determine the effective media URL and type for this slide
          const effectiveUrl = slide.mediaOverride?.url ?? m.media_url
          const effectiveMime = slide.mediaOverride?.mimeType ?? null
          const effectiveType = effectiveMime
            ? (effectiveMime.startsWith('image/') ? 'photo' : effectiveMime.startsWith('video/') ? 'video' : effectiveMime.startsWith('audio/') ? 'voice' : m.type)
            : m.type
          const TypeIcon = effectiveType === 'photo' ? Camera : effectiveType === 'video' ? VideoIcon : effectiveType === 'voice' ? Mic : PenLine

          // Photo slide
          if (effectiveType === 'photo' && effectiveUrl) {
            return (
              <View style={{ width: SW, height: SH }}>
                <Image source={{ uri: effectiveUrl }} style={{ width: SW, height: SH }} resizeMode="cover" />
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View style={{ position: 'absolute', bottom: 80, left: 24, right: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TypeIcon size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{time}</Text>
                  </View>
                  {m.caption ? (
                    <Text style={{ fontSize: 20, fontWeight: '500', color: '#fff' }}>{m.caption}</Text>
                  ) : null}
                </View>
              </View>
            )
          }

          // Write moment
          if (effectiveType === 'write') {
            return (
              <LinearGradient
                colors={['#f59e0b', '#f97316', '#f43e5e']}
                style={{ width: SW, height: SH, alignItems: 'center', justifyContent: 'center', padding: 32 }}
              >
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                }}>
                  <PenLine size={32} color="#fff" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '500', color: '#fff', textAlign: 'center', lineHeight: 32 }}>
                  "{m.text_content || m.caption}"
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }}>
                  <TypeIcon size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{time}</Text>
                </View>
              </LinearGradient>
            )
          }

          // Voice slide
          if (effectiveType === 'voice' && effectiveUrl) {
            return (
              <LinearGradient
                colors={['#7c3aed', '#4f46e5', '#2563eb']}
                style={{ width: SW, height: SH, alignItems: 'center', justifyContent: 'center' }}
              >
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.()
                    if (effectiveUrl) {
                      if (playerRef.current) playerRef.current.release()
                      const player = createAudioPlayer(effectiveUrl)
                      playerRef.current = player
                      player.play()
                    }
                  }}
                  style={{
                    width: 96, height: 96, borderRadius: 48,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                  }}
                >
                  <Play size={40} color="#fff" />
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Voice note</Text>
                <View style={{ position: 'absolute', bottom: 80, left: 24, right: 24, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Mic size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{time}</Text>
                  </View>
                  {m.caption ? (
                    <Text style={{ fontSize: 20, fontWeight: '500', color: '#fff', textAlign: 'center' }}>{m.caption}</Text>
                  ) : null}
                </View>
              </LinearGradient>
            )
          }

          // Video slide
          if (effectiveType === 'video' && effectiveUrl) {
            return (
              <View style={{ width: SW, height: SH, backgroundColor: '#000' }}>
                {Platform.OS === 'web' ? (
                  createElement('video', {
                    src: effectiveUrl,
                    autoPlay: true,
                    loop: true,
                    playsInline: true,
                    controls: true,
                    style: { width: SW, height: SH, objectFit: 'contain', backgroundColor: '#000' },
                  })
                ) : (
                  <AVVideo
                    source={{ uri: effectiveUrl }}
                    style={{ width: SW, height: SH }}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping
                    useNativeControls
                  />
                )}
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']}
                  pointerEvents="none"
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View pointerEvents="none" style={{ position: 'absolute', bottom: 80, left: 24, right: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TypeIcon size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{time}</Text>
                  </View>
                  {m.caption ? (
                    <Text style={{ fontSize: 20, fontWeight: '500', color: '#fff' }}>{m.caption}</Text>
                  ) : null}
                </View>
              </View>
            )
          }

          // Fallback — single media_url without type match
          if (effectiveUrl) {
            return (
              <View style={{ width: SW, height: SH }}>
                <Image source={{ uri: effectiveUrl }} style={{ width: SW, height: SH }} resizeMode="cover" />
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View style={{ position: 'absolute', bottom: 80, left: 24, right: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TypeIcon size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{time}</Text>
                  </View>
                  {m.caption ? (
                    <Text style={{ fontSize: 20, fontWeight: '500', color: '#fff' }}>{m.caption}</Text>
                  ) : null}
                </View>
              </View>
            )
          }

          // No media fallback
          return (
            <LinearGradient
              colors={['#374151', '#111827']}
              style={{ width: SW, height: SH, alignItems: 'center', justifyContent: 'center' }}
            >
              <VideoIcon size={48} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>Moment</Text>
            </LinearGradient>
          )
        })()}

        {/* RITUALS SUMMARY SLIDE */}
        {slide.kind === 'rituals' && (
          <StaggeredRituals rituals={slide.data as RitualLog[]} />
        )}

        {/* SEEDS SUMMARY SLIDE */}
        {slide.kind === 'seeds' && (
          <StaggeredSeeds seeds={slide.data as SeedLog[]} />
        )}

        {/* OUTRO SLIDE */}
        {slide.kind === 'outro' && (
          <StaggeredOutro />
        )}
        </Animated.View>
      </TouchableOpacity>

      {/* Bottom hint */}
      <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Tap to continue</Text>
      </View>
    </View>
  )
}
