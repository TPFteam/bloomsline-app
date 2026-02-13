import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { createAudioPlayer } from 'expo-audio'
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
} from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const { width: SW, height: SH } = Dimensions.get('window')
const SLIDE_DURATION = 5000

// ============================================
// TYPES
// ============================================
interface Moment {
  id: string
  type: string
  media_url: string | null
  text_content: string | null
  caption: string | null
  created_at: string
  moods: string[] | null
}

interface SeedLog {
  anchor_id: string
  label: string
  type: 'grow' | 'letgo'
}

interface StorySlide {
  kind: 'intro' | 'moment' | 'seeds' | 'outro'
  data?: Moment | SeedLog[]
}

// ============================================
// MAIN COMPONENT
// ============================================
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

  // Fetch data for the story
  useEffect(() => {
    if (!user?.id || !member?.id) return

    async function load() {
      const dateStr = (params.date || new Date().toISOString()).split('T')[0]
      const dayStart = new Date(dateStr + 'T00:00:00')
      const dayEnd = new Date(dateStr + 'T23:59:59.999')

      const y = dayStart.getFullYear()
      const mo = String(dayStart.getMonth() + 1).padStart(2, '0')
      const d = String(dayStart.getDate()).padStart(2, '0')
      const localDate = `${y}-${mo}-${d}`

      const [momentsRes, logsRes] = await Promise.all([
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
      ])

      const moments = (momentsRes.data ?? []) as Moment[]
      const seedLogs: SeedLog[] = (logsRes.data ?? []).map((l: any) => ({
        anchor_id: l.anchor_id,
        label: l.member_anchors?.label_en || 'Seed',
        type: (l.member_anchors?.type || 'grow') as 'grow' | 'letgo',
      }))

      // Build slides
      const builtSlides: StorySlide[] = [
        { kind: 'intro' },
        ...moments.map(m => ({ kind: 'moment' as const, data: m })),
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
        {/* INTRO SLIDE */}
        {slide.kind === 'intro' && (
          <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
            <LinearGradient
              colors={['#4A9A86', '#5AB39C']}
              style={{
                width: 80, height: 80, borderRadius: 40,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              }}
            >
              {new Date().getHours() >= 18
                ? <Moon size={40} color="#fff" />
                : <Sun size={40} color="#fff" />}
            </LinearGradient>

            <Text style={{ fontSize: 30, fontWeight: '700', color: '#fff', marginBottom: 8 }}>
              Your Day
            </Text>

            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
              {[
                momentsCount > 0 ? `${momentsCount} moment${momentsCount !== 1 ? 's' : ''}` : null,
                seedsCount > 0 ? `${seedsCount} seed${seedsCount !== 1 ? 's' : ''}` : null,
              ].filter(Boolean).join(' \u00B7 ') || 'Your day'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, opacity: 0.4 }}>
              <Sparkles size={16} color="#fff" />
              <Text style={{ fontSize: 13, color: '#fff' }}>Here's your day</Text>
            </View>
          </View>
        )}

        {/* MOMENT SLIDE */}
        {slide.kind === 'moment' && (() => {
          const m = slide.data as Moment
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          const TypeIcon = m.type === 'photo' ? Camera : m.type === 'video' ? VideoIcon : m.type === 'voice' ? Mic : PenLine

          // Photo moment
          if (m.type === 'photo' && m.media_url) {
            return (
              <View style={{ width: SW, height: SH }}>
                <Image source={{ uri: m.media_url }} style={{ width: SW, height: SH }} resizeMode="cover" />
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
          if (m.type === 'write') {
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

          // Voice moment
          if (m.type === 'voice') {
            return (
              <LinearGradient
                colors={['#7c3aed', '#4f46e5', '#2563eb']}
                style={{ width: SW, height: SH, alignItems: 'center', justifyContent: 'center' }}
              >
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.()
                    if (m.media_url) {
                      if (playerRef.current) playerRef.current.release()
                      const player = createAudioPlayer(m.media_url)
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

          // Video / fallback
          return (
            <LinearGradient
              colors={['#374151', '#111827']}
              style={{ width: SW, height: SH, alignItems: 'center', justifyContent: 'center' }}
            >
              <VideoIcon size={48} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>Video moment</Text>
              <View style={{ position: 'absolute', bottom: 80, left: 24, right: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TypeIcon size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{time}</Text>
                </View>
                {m.caption ? (
                  <Text style={{ fontSize: 20, fontWeight: '500', color: '#fff' }}>{m.caption}</Text>
                ) : null}
              </View>
            </LinearGradient>
          )
        })()}

        {/* SEEDS SUMMARY SLIDE */}
        {slide.kind === 'seeds' && (() => {
          const seeds = slide.data as SeedLog[]
          const grow = seeds.filter(s => s.type === 'grow')
          const letgo = seeds.filter(s => s.type === 'letgo')

          return (
            <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
              <LinearGradient
                colors={['#fbbf24', '#f59e0b']}
                style={{
                  width: 64, height: 64, borderRadius: 32,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                }}
              >
                <Leaf size={32} color="#fff" />
              </LinearGradient>

              <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 24 }}>
                Your Little Steps
              </Text>

              {grow.length > 0 && (
                <View style={{
                  backgroundColor: 'rgba(74,154,134,0.2)', borderRadius: 16,
                  padding: 16, width: '100%', maxWidth: 300, marginBottom: 12,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#5AB39C', marginBottom: 8 }}>
                    Keep ({grow.length})
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {grow.slice(0, 5).map((s, i) => (
                      <View key={i} style={{
                        paddingHorizontal: 12, paddingVertical: 6,
                        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999,
                      }}>
                        <Text style={{ fontSize: 13, color: '#fff' }}>{s.label}</Text>
                      </View>
                    ))}
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
                    {letgo.slice(0, 5).map((s, i) => (
                      <View key={i} style={{
                        paddingHorizontal: 12, paddingVertical: 6,
                        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999,
                      }}>
                        <Text style={{ fontSize: 13, color: '#fff' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )
        })()}

        {/* OUTRO SLIDE */}
        {slide.kind === 'outro' && (
          <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
            <LinearGradient
              colors={['#4A9A86', '#5AB39C']}
              style={{
                width: 80, height: 80, borderRadius: 40,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              }}
            >
              <Heart size={36} color="#fff" />
            </LinearGradient>

            <Text style={{ fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 8 }}>
              Well done!
            </Text>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>
              Every small step matters.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, opacity: 0.4 }}>
              <Heart size={16} color="#fff" />
              <Text style={{ fontSize: 13, color: '#fff' }}>See you tomorrow</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom hint */}
      <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Tap to continue</Text>
      </View>
    </View>
  )
}
