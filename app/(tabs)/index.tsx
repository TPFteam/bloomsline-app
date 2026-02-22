import { useEffect, useState, useCallback, useMemo, useRef, createElement } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  Easing,
  TextInput,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
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
  X,
  Moon,
  Eye,
  Sprout,
  StretchHorizontal,
  MapPin,
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
  Check,
  Mic,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { fetchMemberRituals, fetchTodayCompletions, type MemberRitual, type RitualCompletion } from '@/lib/services/rituals'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { Video, ResizeMode } from 'expo-av'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Cross-platform audio player for voice notes in moment detail
function VoiceNotePlayer({ uri }: { uri: string }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 32 }}>
        <LinearGradient
          colors={['#fbbf24', '#f97316']}
          style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Mic size={36} color="#fff" />
        </LinearGradient>
        {createElement('audio', {
          src: uri,
          controls: true,
          style: { width: SCREEN_WIDTH - 80, maxWidth: 320, marginTop: 8 },
        })}
      </View>
    )
  }
  // Native: use expo-av Audio
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <LinearGradient
        colors={['#fbbf24', '#f97316']}
        style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
      >
        <Mic size={36} color="#fff" />
      </LinearGradient>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Voice note</Text>
    </View>
  )
}

// Ritual icon mapping
const RITUAL_ICONS: Record<string, any> = {
  eye: Eye, coffee: Coffee, sprout: Sprout, 'stretch-horizontal': StretchHorizontal,
  sun: Sun, 'map-pin': MapPin, music: Music, cloud: Cloud,
  'refresh-cw': RefreshCw, heart: Heart, list: List, gift: Gift,
  moon: Moon, hand: Hand, stars: Stars, 'calendar-heart': CalendarHeart,
  sofa: Sofa, mail: Mail, smile: Smile, shield: Shield,
}

const RITUAL_CATEGORY_COLORS: Record<string, { accent: string; bg: string }> = {
  morning: { accent: '#f59e0b', bg: '#fef3c7' },
  midday: { accent: '#059669', bg: '#d1fae5' },
  evening: { accent: '#6366f1', bg: '#e0e7ff' },
  selfcare: { accent: '#ec4899', bg: '#fce7f3' },
}

// Anchor icon mapping (same as Next.js app)
const ANCHOR_ICONS: Record<string, any> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookOpen, brain: Brain,
  bed: Bed, apple: Apple, meditation: Circle, walk: Footprints,
  social: Users, heart: Heart, sprout: Sparkles, journal: PenLine,
  gratitude: Sparkles, nature: TreePine, creativity: Palette,
  breathing: Wind, stretch: StretchHorizontal, vegetables: Sparkles, music: Music,
  cigarette: Cigarette, wine: Wine, coffee: Coffee, cookie: Cookie,
  smartphone: Smartphone, tv: Tv, candy: Candy, junkfood: Pizza,
}

// Predefined anchor options with labels
const ANCHOR_OPTIONS: Record<string, { labelEn: string; labelFr: string }> = {
  droplet: { labelEn: 'Water', labelFr: 'Eau' },
  dumbbell: { labelEn: 'Exercise', labelFr: 'Exercice' },
  book: { labelEn: 'Reading', labelFr: 'Lecture' },
  brain: { labelEn: 'Learning', labelFr: 'Apprentissage' },
  bed: { labelEn: 'Sleep', labelFr: 'Sommeil' },
  apple: { labelEn: 'Healthy Eating', labelFr: 'Manger sain' },
  meditation: { labelEn: 'Meditation', labelFr: 'Méditation' },
  walk: { labelEn: 'Walking', labelFr: 'Marche' },
  social: { labelEn: 'Social', labelFr: 'Social' },
  heart: { labelEn: 'Self-care', labelFr: 'Bien-être' },
  sprout: { labelEn: 'Growth', labelFr: 'Croissance' },
  journal: { labelEn: 'Journaling', labelFr: 'Journal' },
  gratitude: { labelEn: 'Gratitude', labelFr: 'Gratitude' },
  nature: { labelEn: 'Nature', labelFr: 'Nature' },
  creativity: { labelEn: 'Creativity', labelFr: 'Créativité' },
  breathing: { labelEn: 'Breathing', labelFr: 'Respiration' },
  stretch: { labelEn: 'Stretching', labelFr: 'Étirements' },
  vegetables: { labelEn: 'Vegetables', labelFr: 'Légumes' },
  music: { labelEn: 'Music', labelFr: 'Musique' },
  cigarette: { labelEn: 'Smoking', labelFr: 'Tabac' },
  wine: { labelEn: 'Alcohol', labelFr: 'Alcool' },
  coffee: { labelEn: 'Caffeine', labelFr: 'Caféine' },
  cookie: { labelEn: 'Snacking', labelFr: 'Grignotage' },
  smartphone: { labelEn: 'Screen Time', labelFr: 'Écrans' },
  tv: { labelEn: 'TV', labelFr: 'Télé' },
  candy: { labelEn: 'Sugar', labelFr: 'Sucre' },
  junkfood: { labelEn: 'Junk Food', labelFr: 'Malbouffe' },
}

const GROW_OPTIONS = [
  'droplet', 'dumbbell', 'book', 'brain', 'bed', 'apple',
  'meditation', 'walk', 'social', 'heart', 'sprout', 'journal',
  'gratitude', 'nature', 'creativity', 'breathing', 'stretch', 'vegetables', 'music',
]

const LETGO_OPTIONS = [
  'cigarette', 'wine', 'coffee', 'cookie', 'smartphone', 'tv', 'candy', 'junkfood',
]

type Anchor = {
  id: string
  anchor_id?: string
  icon: string
  label_en: string
  label_fr: string
  type: 'grow' | 'letgo'
}

type MomentMediaItem = {
  id: string
  moment_id: string
  media_url: string
  mime_type: string
  sort_order: number
}

type MomentItem = {
  id: string
  created_at: string
  moods: string[] | null
  type: string
  caption: string | null
  media_url: string | null
  thumbnail_url: string | null
  text_content: string | null
  media_items?: MomentMediaItem[]
}

function RotatingRing() {
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()
  }, [])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <Animated.View style={{
      width: 48, height: 48, borderRadius: 24,
      borderWidth: 2, borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.4)',
      transform: [{ rotate }],
    }} />
  )
}

function FullscreenVideoPlayer({ uri }: { uri: string }) {
  const videoRef = useRef<Video>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)

  useEffect(() => {
    if (!showControls) return
    const timer = setTimeout(() => setShowControls(false), 3000)
    return () => clearTimeout(timer)
  }, [showControls, isPlaying])

  const togglePlay = async () => {
    if (!videoRef.current) return
    if (isPlaying) await videoRef.current.pauseAsync()
    else await videoRef.current.playAsync()
    setIsPlaying(!isPlaying)
    setShowControls(true)
  }

  const toggleMute = async () => {
    if (!videoRef.current) return
    await videoRef.current.setIsMutedAsync(!isMuted)
    setIsMuted(!isMuted)
    setShowControls(true)
  }

  const goFullscreen = async () => {
    if (!videoRef.current) return
    await (videoRef.current as any).presentFullscreenPlayer()
    setShowControls(true)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={{ flex: 1 }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping
        isMuted={isMuted}
      />
      <Pressable
        onPress={() => setShowControls(prev => !prev)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {showControls && (
          <>
            {/* Center play/pause */}
            <TouchableOpacity
              onPress={togglePlay}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                marginTop: -28, marginLeft: -28,
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPlaying
                ? <Pause size={26} color="#fff" fill="#fff" />
                : <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
              }
            </TouchableOpacity>

            {/* Bottom controls — mute + fullscreen */}
            <View style={{
              position: 'absolute', bottom: 12, left: 16, right: 16,
              flexDirection: 'row', justifyContent: 'space-between',
            }}>
              <TouchableOpacity
                onPress={toggleMute}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {isMuted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goFullscreen}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Maximize2 size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Pressable>
    </View>
  )
}

export default function HomeScreen() {
  const { user, member } = useAuth()
  const router = useRouter()
  const [moments, setMoments] = useState<MomentItem[]>([])
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [anchorLogs, setAnchorLogs] = useState<Record<string, number>>({})
  const [anchorLogEntries, setAnchorLogEntries] = useState<{ anchor_id: string; logged_at: string }[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState(1)
  const [centerHour, setCenterHour] = useState(12)
  const flowScrollRef = useRef<ScrollView>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [viewingMoment, setViewingMoment] = useState<MomentItem | null>(null)
  const [memberRituals, setMemberRituals] = useState<MemberRitual[]>([])
  const [ritualCompletions, setRitualCompletions] = useState<RitualCompletion[]>([])
  const [previewRitual, setPreviewRitual] = useState<{ ritual: MemberRitual; completion: RitualCompletion | null } | null>(null)
  const [showAddAnchor, setShowAddAnchor] = useState(false)
  const [anchorsTab, setAnchorsTab] = useState<'grow' | 'letgo'>('grow')
  const [customAnchorMode, setCustomAnchorMode] = useState(false)
  const [customAnchorLabel, setCustomAnchorLabel] = useState('')
  const [customAnchorIcon, setCustomAnchorIcon] = useState<string | null>(null)

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

    const [momentsRes, anchorsRes, logsRes, ritualsData, completionsData] = await Promise.all([
      supabase
        .from('moments')
        .select('id, created_at, moods, type, caption, media_url, thumbnail_url, text_content')
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
        .select('anchor_id, logged_at')
        .eq('member_id', member.id)
        .eq('log_date', dateStr),
      fetchMemberRituals(member.id),
      fetchTodayCompletions(member.id),
    ])

    const momentsList = (momentsRes.data ?? []) as MomentItem[]

    // Fetch media items for moments that may have multiple
    if (momentsList.length > 0) {
      const momentIds = momentsList.map(m => m.id)
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
        for (const m of momentsList) {
          m.media_items = mediaByMoment.get(m.id) || []
        }
      }
    }

    setMoments(momentsList)
    setAnchors((anchorsRes.data ?? []) as Anchor[])
    setMemberRituals(ritualsData)
    setRitualCompletions(completionsData)

    const logEntries = (logsRes.data ?? []) as { anchor_id: string; logged_at: string }[]
    setAnchorLogEntries(logEntries)
    const counts: Record<string, number> = {}
    logEntries.forEach((l) => {
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
    setAnchorLogEntries(prev => [...prev, { anchor_id: anchorId, logged_at: now.toISOString() }])
    await supabase.from('anchor_logs').insert({
      member_id: member.id,
      anchor_id: anchorId,
      logged_at: now.toISOString(),
      log_date: localDate,
    })
  }

  async function addAnchor(iconKey: string, type: 'grow' | 'letgo') {
    if (!member?.id) return
    const opt = ANCHOR_OPTIONS[iconKey]
    if (!opt) return

    const { data, error } = await supabase
      .from('member_anchors')
      .insert({
        member_id: member.id,
        icon: iconKey,
        label_en: opt.labelEn,
        label_fr: opt.labelFr,
        type,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding anchor:', error)
      return
    }

    if (data) {
      setAnchors(prev => [...prev, {
        id: data.id,
        icon: data.icon,
        label_en: data.label_en,
        label_fr: data.label_fr,
        type: data.type as 'grow' | 'letgo',
      }])
    }

    setShowAddAnchor(false)
  }

  async function addCustomAnchor() {
    if (!member?.id || !customAnchorLabel.trim() || !customAnchorIcon) return

    const { data, error } = await supabase
      .from('member_anchors')
      .insert({
        member_id: member.id,
        icon: customAnchorIcon,
        label_en: customAnchorLabel.trim(),
        label_fr: customAnchorLabel.trim(),
        type: anchorsTab,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding custom anchor:', error)
      return
    }

    if (data) {
      setAnchors(prev => [...prev, {
        id: data.id,
        icon: data.icon,
        label_en: data.label_en,
        label_fr: data.label_fr,
        type: data.type as 'grow' | 'letgo',
      }])
    }

    setShowAddAnchor(false)
    setCustomAnchorMode(false)
    setCustomAnchorLabel('')
    setCustomAnchorIcon(null)
  }

  // Zoom helpers
  const flowContainerWidth = SCREEN_WIDTH - 80 // padding inside the card
  const getVisibleHours = () => [24, 12, 8, 6][zoomLevel - 1] || 24
  const flowScale = 24 / getVisibleHours() // 1x at 24h, 2x at 12h, 3x at 8h, 4x at 6h
  const flowContentWidth = flowContainerWidth * flowScale

  // Returns percentage position over the full 24h content width
  const hourToPosition = (hour: number) => {
    return (hour / 24) * 100
  }

  // Auto-scroll flow to center on current time when zoom changes
  useEffect(() => {
    if (zoomLevel <= 1) return // no scroll needed at 24h
    const scrollTarget = isToday() ? currentHour : centerHour
    const pxPerHour = flowContentWidth / 24
    const scrollX = scrollTarget * pxPerHour - flowContainerWidth / 2
    const clamped = Math.max(0, Math.min(scrollX, flowContentWidth - flowContainerWidth))
    setTimeout(() => {
      flowScrollRef.current?.scrollTo({ x: clamped, animated: true })
    }, 100)
  }, [zoomLevel])

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
  const flowWidth = flowContentWidth

  // Generate video thumbnails
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({})
  const videoMoments = useMemo(() => moments.filter(m => m.type === 'video' && m.media_url), [moments])
  useEffect(() => {
    let cancelled = false
    async function gen() {
      const thumbs: Record<string, string> = {}
      for (const m of videoMoments) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(m.media_url!, { time: 500 })
          if (cancelled) return
          thumbs[m.id] = uri
        } catch { /* skip */ }
      }
      if (!cancelled) setVideoThumbs(thumbs)
    }
    if (videoMoments.length > 0) gen()
    return () => { cancelled = true }
  }, [videoMoments])

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
            {(moments.length > 0 || totalSeedLogs > 0) && (
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
                      <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                        <RotatingRing />
                        <View style={{
                          position: 'absolute',
                          width: 34, height: 34, borderRadius: 17,
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Heart size={16} color="#ffffff" fill="#ffffff" />
                        </View>
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

              {/* Timeline visualization — horizontally scrollable when zoomed */}
              <ScrollView
                ref={flowScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={zoomLevel > 1}
                bounces={false}
                style={{
                  height: 160,
                  backgroundColor: 'rgba(236, 253, 245, 0.5)',
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
              <View style={{
                width: flowContentWidth,
                height: 160,
                position: 'relative',
              }}>
                {/* Grid lines */}
                <View style={{ position: 'absolute', left: 0, right: 0, top: '25%', height: 1, backgroundColor: 'rgba(167, 243, 208, 0.3)' }} />
                <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(167, 243, 208, 0.5)' }} />
                <View style={{ position: 'absolute', left: 0, right: 0, top: '75%', height: 1, backgroundColor: 'rgba(167, 243, 208, 0.3)' }} />

                {/* Ritual markers on timeline */}
                {memberRituals.map((mr) => {
                  const completion = ritualCompletions.find(c => c.ritual_id === mr.ritual_id && c.completed)
                  const isCompleted = !!completion
                  const timeStr = mr.planned_time
                  if (!timeStr) return null

                  // Use actual completion time if completed, otherwise use planned time
                  let displayTime = timeStr.slice(0, 5)
                  let hour: number
                  if (isCompleted && completion.created_at) {
                    const ct = new Date(completion.created_at)
                    hour = ct.getHours() + ct.getMinutes() / 60
                    displayTime = `${String(ct.getHours()).padStart(2, '0')}:${String(ct.getMinutes()).padStart(2, '0')}`
                  } else {
                    const [hours, minutes] = timeStr.split(':').map(Number)
                    hour = hours + minutes / 60
                  }
                  const x = hourToPosition(hour)
                  if (x < -2 || x > 102) return null

                  const isPast = isToday() && hour < currentHour
                  const cat = RITUAL_CATEGORY_COLORS[mr.ritual.category] || RITUAL_CATEGORY_COLORS.morning
                  const IconComp = RITUAL_ICONS[mr.ritual.icon || ''] || Circle

                  return (
                    <TouchableOpacity
                      key={`r-${mr.id}`}
                      activeOpacity={0.7}
                      onPress={() => setPreviewRitual({ ritual: mr, completion: isCompleted ? completion : null })}
                      style={{
                        position: 'absolute',
                        left: `${x}%`,
                        top: 6,
                        marginLeft: -11,
                        alignItems: 'center',
                        zIndex: 10,
                      }}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: isCompleted ? '#d1fae5' : 'rgba(255,255,255,0.9)',
                        borderWidth: isCompleted ? 0 : 1.5,
                        borderColor: isCompleted ? 'transparent' : isPast ? '#fca5a5' : '#d1d5db',
                        borderStyle: isCompleted ? 'solid' : 'dashed',
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
                      }}>
                        {isCompleted ? (
                          <Check size={11} color="#059669" strokeWidth={3} />
                        ) : (
                          <IconComp size={11} color={isPast ? '#f87171' : cat.accent} />
                        )}
                      </View>
                      <Text style={{
                        fontSize: 8, color: isCompleted ? '#059669' : isPast ? '#f87171' : '#9ca3af',
                        fontWeight: '600', marginTop: 1,
                      }}>
                        {displayTime}
                      </Text>
                    </TouchableOpacity>
                  )
                })}

                {/* Seed log markers on timeline */}
                {anchorLogEntries.map((log, idx) => {
                  const t = new Date(log.logged_at)
                  const hour = t.getHours() + t.getMinutes() / 60
                  const x = hourToPosition(hour)
                  if (x < -2 || x > 102) return null

                  const anchor = anchors.find(a => a.id === log.anchor_id)
                  const isGrow = anchor?.type === 'grow'
                  const IconComp = anchor ? (ANCHOR_ICONS[anchor.icon] || Circle) : Circle

                  return (
                    <View
                      key={`s-${idx}`}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: `${x}%`,
                        bottom: 6,
                        marginLeft: -9,
                        alignItems: 'center',
                      }}
                    >
                      <View style={{
                        width: 18, height: 18, borderRadius: 9,
                        backgroundColor: isGrow ? '#ecfdf5' : '#fef3c7',
                        borderWidth: 1.5,
                        borderColor: isGrow ? '#a7f3d0' : '#fde68a',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <IconComp size={9} color={isGrow ? '#059669' : '#d97706'} />
                      </View>
                    </View>
                  )
                })}

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

                {/* Moment connecting curve (rendered behind orbs) */}
                {moments.length > 1 && (
                  <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} pointerEvents="none">
                    <Path
                      d={moments.reduce((path, m, i) => {
                        const t = new Date(m.created_at)
                        const xPct = hourToPosition(t.getHours() + t.getMinutes() / 60)
                        const x = (xPct / 100) * flowWidth
                        const score = m.moods?.[0] ? getMoodScore(m.moods[0]) : 60
                        const y = (1 - ((score / 100) * 0.7 + 0.15)) * 160
                        if (i === 0) return `M ${x} ${y}`
                        const prevM = moments[i - 1]!
                        const prevT = new Date(prevM.created_at)
                        const prevXPct = hourToPosition(prevT.getHours() + prevT.getMinutes() / 60)
                        const prevX = (prevXPct / 100) * flowWidth
                        const prevScore = prevM.moods?.[0] ? getMoodScore(prevM.moods[0]) : 60
                        const prevY = (1 - ((prevScore / 100) * 0.7 + 0.15)) * 160
                        const cpX = (prevX + x) / 2
                        return `${path} C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`
                      }, '')}
                      stroke="#10b981"
                      strokeWidth={2}
                      opacity={0.4}
                      fill="none"
                      strokeLinecap="round"
                    />
                  </Svg>
                )}

                {/* Moment orbs on timeline */}
                {moments.length > 0 ? (
                  moments.map((m) => {
                    const t = new Date(m.created_at)
                    const h = t.getHours() + t.getMinutes() / 60
                    const x = hourToPosition(h)
                    if (x < -2 || x > 102) return null

                    // Y position based on mood score
                    const score = m.moods?.[0] ? getMoodScore(m.moods[0]) : 60
                    const y = 100 - ((score / 100) * 70 + 15)
                    const colors = getMoodColors(m.moods?.[0])

                    const hasPhoto = m.type === 'photo' || (m.type === 'mixed' && m.media_items?.some(mi => mi.mime_type?.startsWith('image/')))
                    const isPhoto = hasPhoto && m.media_url
                    const isVideo = m.type === 'video'
                    const videoThumb = isVideo ? (m.thumbnail_url || videoThumbs[m.id]) : null
                    const isCard = isPhoto || isVideo
                    const mediaCount = m.media_items?.length ?? 0

                    return (
                      <TouchableOpacity
                        key={m.id}
                        activeOpacity={0.8}
                        onPress={() => setViewingMoment(m)}
                        style={{
                          position: 'absolute',
                          left: `${x}%`, top: `${y}%`,
                          marginLeft: -16,
                          marginTop: isCard ? -20 : -16,
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
                            {mediaCount > 1 && (
                              <View style={{
                                position: 'absolute', bottom: 1, right: 1,
                                minWidth: 14, height: 14, borderRadius: 7,
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                alignItems: 'center', justifyContent: 'center',
                                paddingHorizontal: 2,
                              }}>
                                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>{mediaCount}</Text>
                              </View>
                            )}
                          </View>
                        ) : isVideo ? (
                          <View style={{
                            width: 32, height: 40, borderRadius: 8,
                            overflow: 'hidden',
                            borderWidth: 2, borderColor: '#ffffff',
                            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
                          }}>
                            {videoThumb ? (
                              <Image
                                source={{ uri: videoThumb }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            ) : (
                              <LinearGradient
                                colors={[colors.from, colors.to]}
                                style={{ width: '100%', height: '100%' }}
                              />
                            )}
                            <View style={{
                              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                              alignItems: 'center', justifyContent: 'center',
                              backgroundColor: 'rgba(0,0,0,0.2)',
                            }}>
                              <View style={{
                                width: 18, height: 18, borderRadius: 9,
                                backgroundColor: '#ffffff',
                                alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Play size={9} color="#111827" fill="#111827" style={{ marginLeft: 1 }} />
                              </View>
                            </View>
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
                            {mediaCount > 1 && (
                              <View style={{
                                position: 'absolute', bottom: -3, right: -3,
                                minWidth: 14, height: 14, borderRadius: 7,
                                backgroundColor: '#10b981',
                                alignItems: 'center', justifyContent: 'center',
                                paddingHorizontal: 2,
                                borderWidth: 1.5, borderColor: '#fff',
                              }}>
                                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>{mediaCount}</Text>
                              </View>
                            )}
                          </LinearGradient>
                        )}
                      </TouchableOpacity>
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
                {/* Time labels — inside scrollable area */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', bottom: 4, left: 4, right: 4 }}>
                  {(() => {
                    // Always show hour labels across the full 24h content
                    const labelCount = zoomLevel === 1 ? 3 : Math.min(Math.round(24 / (getVisibleHours() / 4)), 13)
                    const step = 24 / (labelCount - 1)
                    if (zoomLevel === 1) {
                      return ['Morning', 'Afternoon', 'Evening'].map((label, i) => (
                        <Text key={i} style={{ fontSize: 12, color: '#9ca3af' }}>{label}</Text>
                      ))
                    }
                    return Array.from({ length: labelCount }).map((_, i) => {
                      const h = Math.round(i * step)
                      const p = h >= 12 ? 'PM' : 'AM'
                      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                      return <Text key={i} style={{ fontSize: 10, color: '#9ca3af' }}>{h12}{p}</Text>
                    })
                  })()}
                </View>
              </View>
              </ScrollView>

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
                <TouchableOpacity onPress={() => router.push('/seeds')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#d97706' }}>View all</Text>
                  <ChevronRight size={14} color="#d97706" />
                </TouchableOpacity>
              </View>

              {/* Seeds grid - 4 columns */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 8 }}>
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
                        width: '22.5%',
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
                  onPress={() => setShowAddAnchor(true)}
                  activeOpacity={0.7}
                  style={{
                    width: '22.5%',
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

            {/* ===== UPCOMING RITUALS ===== */}
            {memberRituals.length > 0 && (() => {
              const completedIds = new Set(ritualCompletions.filter(c => c.completed).map(c => c.ritual_id))
              const upcoming = memberRituals.filter(mr => !completedIds.has(mr.ritual_id))
              const completedCount = memberRituals.length - upcoming.length

              return (
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderRadius: 24, padding: 20,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
                  shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
                }}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <LinearGradient
                        colors={['#34d399', '#059669']}
                        style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Circle size={16} color="#ffffff" />
                      </LinearGradient>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Upcoming Rituals</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>
                      {completedCount}/{memberRituals.length} done
                    </Text>
                  </View>

                  {upcoming.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>🎉</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' }}>All done for today!</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {upcoming.slice(0, 4).map((mr) => {
                        const cat = RITUAL_CATEGORY_COLORS[mr.ritual.category] || RITUAL_CATEGORY_COLORS.morning
                        const IconComp = RITUAL_ICONS[mr.ritual.icon || ''] || Heart
                        const timeStr = mr.planned_time ? mr.planned_time.slice(0, 5) : ''

                        return (
                          <TouchableOpacity
                            key={mr.id}
                            activeOpacity={0.7}
                            onPress={() => router.push('/(tabs)/rituals')}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 10,
                              backgroundColor: '#f9fafb', borderRadius: 14, padding: 12,
                            }}
                          >
                            <View style={{
                              width: 36, height: 36, borderRadius: 10,
                              backgroundColor: cat.bg, alignItems: 'center', justifyContent: 'center',
                            }}>
                              <IconComp size={17} color={cat.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }} numberOfLines={1}>
                                {mr.ritual.name}
                              </Text>
                              {timeStr ? (
                                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{timeStr}</Text>
                              ) : null}
                            </View>
                            {mr.ritual.duration_suggestion ? (
                              <View style={{ backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>{mr.ritual.duration_suggestion}m</Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        )
                      })}
                      {upcoming.length > 4 && (
                        <TouchableOpacity
                          onPress={() => router.push('/(tabs)/rituals')}
                          style={{ alignItems: 'center', paddingVertical: 8 }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>
                            +{upcoming.length - 4} more · View all
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )
            })()}

            {/* A Moment to Pause — reflect entry point */}
            <TouchableOpacity
              onPress={() => router.push('/reflect')}
              activeOpacity={0.85}
              style={{ marginTop: 28, borderRadius: 20, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#fdf2f8', '#fce7f3', '#f5f3ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 24,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(236,72,153,0.08)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: 'rgba(244,63,94,0.1)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Heart size={18} color="#f43f5e" />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: '#831843' }}>
                    A moment to pause
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#9d174d', lineHeight: 20, opacity: 0.8 }}>
                  Take a breath. Check in with yourself — how are you really feeling today?
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#ec4899' }}>
                    Reflect now
                  </Text>
                  <ChevronRight size={14} color="#ec4899" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Moment Lightbox */}
      <Modal visible={!!viewingMoment} transparent animationType="fade" onRequestClose={() => setViewingMoment(null)}>
        {viewingMoment && (() => {
          const moodColors = getMoodColors(viewingMoment.moods?.[0])
          const time = new Date(viewingMoment.created_at)
          const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const mediaItems = viewingMoment.media_items ?? []
          const hasMedia = viewingMoment.media_url || mediaItems.length > 0
          const hasImage = (viewingMoment.type === 'photo' || viewingMoment.type === 'mixed') && hasMedia
          const hasVideo = viewingMoment.type === 'video' && viewingMoment.media_url
          const showLightbox = hasImage || hasVideo || mediaItems.length > 0

          return showLightbox ? (
            /* Media lightbox — dark backdrop, swipeable carousel for multi-media */
            <View style={{ flex: 1, backgroundColor: '#000' }}>
              {/* Close button */}
              <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setViewingMoment(null)}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>

              {/* Media — carousel for multi, single for one */}
              {mediaItems.length > 1 ? (
                <View style={{ flex: 1 }}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                  >
                    {mediaItems.map((mi) => {
                      const isImg = mi.mime_type?.startsWith('image/')
                      const isVid = mi.mime_type?.startsWith('video/')
                      const isAud = mi.mime_type?.startsWith('audio/')
                      const mediaHeight = SCREEN_HEIGHT - 200
                      return (
                        <View key={mi.id} style={{ width: SCREEN_WIDTH, height: mediaHeight, justifyContent: 'center', alignItems: 'center' }}>
                          {isImg ? (
                            <Image
                              source={{ uri: mi.media_url }}
                              style={{ width: SCREEN_WIDTH, height: mediaHeight }}
                              resizeMode="contain"
                            />
                          ) : isVid ? (
                            <FullscreenVideoPlayer uri={mi.media_url} />
                          ) : isAud ? (
                            <VoiceNotePlayer uri={mi.media_url} />
                          ) : null}
                        </View>
                      )
                    })}
                  </ScrollView>
                  {/* Page indicator */}
                  <View style={{
                    position: 'absolute', bottom: 8, left: 0, right: 0,
                    flexDirection: 'row', justifyContent: 'center', gap: 6,
                  }}>
                    {mediaItems.map((_, i) => (
                      <View key={i} style={{
                        width: 6, height: 6, borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.5)',
                      }} />
                    ))}
                  </View>
                </View>
              ) : hasVideo ? (
                <FullscreenVideoPlayer uri={viewingMoment.media_url!} />
              ) : (
                <Pressable onPress={() => setViewingMoment(null)} style={{ flex: 1, justifyContent: 'center' }}>
                  <Image
                    source={{ uri: viewingMoment.media_url! }}
                    style={{ width: '100%', flex: 1 }}
                    resizeMode="contain"
                  />
                </Pressable>
              )}

              {/* Bottom info */}
              <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#000' }}>
                <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                  {viewingMoment.moods?.[0] && (
                    <View style={{
                      alignSelf: 'flex-start',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
                      marginBottom: 6,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                        {viewingMoment.moods[0]}
                      </Text>
                    </View>
                  )}
                  {viewingMoment.caption && (
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '500', marginBottom: 4 }}>
                      {viewingMoment.caption}
                    </Text>
                  )}
                  {mediaItems.length > 1 && (
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 2 }}>
                      {mediaItems.length} items · Swipe to browse
                    </Text>
                  )}
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{timeStr}</Text>
                </View>
              </SafeAreaView>
            </View>
          ) : (
            /* Text/mood moment — white card */
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => setViewingMoment(null)}
            >
              <Pressable onPress={() => {}} style={{
                width: '85%', maxWidth: 380, backgroundColor: '#fff',
                borderRadius: 20, padding: 24,
                shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
              }}>
                {/* Mood badge */}
                {viewingMoment.moods?.[0] && (
                  <LinearGradient
                    colors={[moodColors.from, moodColors.to]}
                    style={{
                      alignSelf: 'flex-start', borderRadius: 16,
                      paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' }}>
                      {viewingMoment.moods[0]}
                    </Text>
                  </LinearGradient>
                )}

                {/* Text content */}
                {viewingMoment.text_content && (
                  <Text style={{ fontSize: 16, color: '#171717', lineHeight: 24, marginBottom: 12 }}>
                    {viewingMoment.text_content}
                  </Text>
                )}

                {/* Caption */}
                {viewingMoment.caption && (
                  <Text style={{ fontSize: 15, color: '#6b7280', marginBottom: 12 }}>
                    {viewingMoment.caption}
                  </Text>
                )}

                {/* Time */}
                <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>{timeStr}</Text>

                {/* Close button */}
                <TouchableOpacity
                  onPress={() => setViewingMoment(null)}
                  style={{
                    backgroundColor: '#f3f4f6', borderRadius: 12,
                    paddingVertical: 14, alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Close</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          )
        })()}
      </Modal>

      {/* Ritual Preview Modal */}
      <Modal visible={!!previewRitual} transparent animationType="fade" onRequestClose={() => setPreviewRitual(null)}>
        {previewRitual && (() => {
          const { ritual: mr, completion } = previewRitual
          const isCompleted = !!completion
          const cat = RITUAL_CATEGORY_COLORS[mr.ritual.category] || RITUAL_CATEGORY_COLORS.morning
          const IconComp = RITUAL_ICONS[mr.ritual.icon || ''] || Circle

          return (
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => setPreviewRitual(null)}
            >
              <Pressable onPress={() => {}} style={{
                width: '85%', maxWidth: 340, backgroundColor: '#fff',
                borderRadius: 24, overflow: 'hidden',
                shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
              }}>
                {/* Header */}
                <View style={{
                  backgroundColor: `${cat.bg}`,
                  paddingVertical: 24, alignItems: 'center',
                }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 16,
                    backgroundColor: cat.accent, alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <IconComp size={28} color="#ffffff" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' }}>
                    {mr.ritual.name}
                  </Text>
                  <View style={{
                    marginTop: 8, backgroundColor: cat.accent, borderRadius: 12,
                    paddingHorizontal: 10, paddingVertical: 3,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>
                      {mr.ritual.category.charAt(0).toUpperCase() + mr.ritual.category.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <View style={{ padding: 16 }}>
                  {/* Description */}
                  {mr.ritual.description ? (
                    <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 }}>
                      {mr.ritual.description}
                    </Text>
                  ) : null}

                  {/* Planned time + duration */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    {mr.planned_time ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} color="#9ca3af" />
                        <Text style={{ fontSize: 13, color: '#6b7280' }}>Planned: {mr.planned_time.slice(0, 5)}</Text>
                      </View>
                    ) : null}
                    {mr.ritual.duration_suggestion ? (
                      <Text style={{ fontSize: 13, color: '#6b7280' }}>{mr.ritual.duration_suggestion} min</Text>
                    ) : null}
                  </View>

                  {/* Completion info */}
                  {isCompleted && completion.created_at ? (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: '#ecfdf5', borderRadius: 14, padding: 12, marginBottom: 12,
                    }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={16} color="#ffffff" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' }}>Completed</Text>
                        <Text style={{ fontSize: 12, color: '#10b981' }}>
                          {new Date(completion.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          {completion.duration_minutes ? ` \u2022 ${completion.duration_minutes} min` : ''}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Notes */}
                  {completion?.notes ? (
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 4 }}>Notes</Text>
                      <Text style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>{completion.notes}</Text>
                    </View>
                  ) : null}

                  {/* Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setPreviewRitual(null)}
                      style={{
                        flex: 1, backgroundColor: '#f3f4f6', borderRadius: 14,
                        paddingVertical: 12, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Close</Text>
                    </TouchableOpacity>
                    {!isCompleted && (
                      <TouchableOpacity
                        onPress={() => {
                          setPreviewRitual(null)
                          router.push('/(tabs)/rituals')
                        }}
                        style={{
                          flex: 1, backgroundColor: cat.accent, borderRadius: 14,
                          paddingVertical: 12, alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>Start</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Pressable>
            </Pressable>
          )
        })()}
      </Modal>

      {/* ===== ADD ANCHOR MODAL ===== */}
      <Modal
        visible={showAddAnchor}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddAnchor(false)
          setCustomAnchorMode(false)
          setCustomAnchorLabel('')
          setCustomAnchorIcon(null)
        }}
      >
        <Pressable
          onPress={() => {
            setShowAddAnchor(false)
            setCustomAnchorMode(false)
            setCustomAnchorLabel('')
            setCustomAnchorIcon(null)
          }}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 16, paddingBottom: 40, paddingHorizontal: 20,
              maxHeight: '80%',
            }}
          >
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 16 }} />

            {/* Title */}
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16 }}>
              {customAnchorMode ? 'Create Your Own' : 'Add a Seed'}
            </Text>

            {/* Tabs */}
            <View style={{
              flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12,
              padding: 3, marginBottom: 16,
            }}>
              <TouchableOpacity
                onPress={() => { setAnchorsTab('grow'); setCustomAnchorMode(false); setCustomAnchorLabel(''); setCustomAnchorIcon(null) }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: anchorsTab === 'grow' ? '#ffffff' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: '600',
                  color: anchorsTab === 'grow' ? '#059669' : '#6b7280',
                }}>Grow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setAnchorsTab('letgo'); setCustomAnchorMode(false); setCustomAnchorLabel(''); setCustomAnchorIcon(null) }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: anchorsTab === 'letgo' ? '#ffffff' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: '600',
                  color: anchorsTab === 'letgo' ? '#d97706' : '#6b7280',
                }}>Let Go</Text>
              </TouchableOpacity>
            </View>

            {customAnchorMode ? (
              /* ===== CUSTOM CREATION MODE ===== */
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Name input */}
                <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Name:</Text>
                <TextInput
                  value={customAnchorLabel}
                  onChangeText={setCustomAnchorLabel}
                  placeholder={anchorsTab === 'grow' ? 'Ex: Journaling' : 'Ex: Junk food'}
                  placeholderTextColor="#9ca3af"
                  maxLength={30}
                  autoFocus
                  style={{
                    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
                    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                    fontSize: 15, color: '#111827', marginBottom: 20,
                  }}
                />

                {/* Icon picker */}
                <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Choose an icon:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {Object.entries(ANCHOR_ICONS).map(([key, IconComp]) => {
                    const isSelected = customAnchorIcon === key
                    const isGrow = anchorsTab === 'grow'
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setCustomAnchorIcon(key)}
                        activeOpacity={0.7}
                        style={{
                          width: 44, height: 44, borderRadius: 12,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isSelected
                            ? (isGrow ? '#059669' : '#d97706')
                            : '#f3f4f6',
                        }}
                      >
                        <IconComp size={20} color={isSelected ? '#ffffff' : '#6b7280'} />
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setCustomAnchorMode(false)
                      setCustomAnchorLabel('')
                      setCustomAnchorIcon(null)
                    }}
                    style={{
                      flex: 1, paddingVertical: 14, borderRadius: 14,
                      borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={addCustomAnchor}
                    disabled={!customAnchorLabel.trim() || !customAnchorIcon}
                    style={{
                      flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                      backgroundColor: customAnchorLabel.trim() && customAnchorIcon
                        ? (anchorsTab === 'grow' ? '#059669' : '#d97706')
                        : '#d1d5db',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* ===== PREDEFINED OPTIONS MODE ===== */
              <>
                <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
                  {anchorsTab === 'grow' ? 'What would you like to grow?' : 'What would you like to let go?'}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {(anchorsTab === 'grow' ? GROW_OPTIONS : LETGO_OPTIONS).map((key) => {
                      const IconComp = ANCHOR_ICONS[key] || Circle
                      const opt = ANCHOR_OPTIONS[key]
                      if (!opt) return null
                      const alreadyAdded = anchors.some(a => a.icon === key)
                      const isGrow = anchorsTab === 'grow'

                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => !alreadyAdded && addAnchor(key, anchorsTab)}
                          disabled={alreadyAdded}
                          activeOpacity={0.7}
                          style={{
                            width: '22%',
                            aspectRatio: 1,
                            borderRadius: 16,
                            backgroundColor: alreadyAdded
                              ? '#f3f4f6'
                              : isGrow ? '#ecfdf5' : '#fef3c7',
                            borderWidth: 2,
                            borderColor: alreadyAdded
                              ? '#e5e7eb'
                              : isGrow ? '#a7f3d0' : '#fde68a',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: alreadyAdded ? 0.5 : 1,
                          }}
                        >
                          <IconComp
                            size={22}
                            color={alreadyAdded ? '#9ca3af' : isGrow ? '#059669' : '#d97706'}
                            style={{ marginBottom: 3 }}
                          />
                          <Text
                            style={{
                              fontSize: 9, fontWeight: '500', textAlign: 'center',
                              color: alreadyAdded ? '#9ca3af' : '#6b7280',
                              paddingHorizontal: 2,
                            }}
                            numberOfLines={1}
                          >
                            {opt.labelEn}
                          </Text>
                          {alreadyAdded && (
                            <View style={{
                              position: 'absolute', top: -4, right: -4,
                              width: 18, height: 18, borderRadius: 9,
                              backgroundColor: '#d1d5db',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Check size={10} color="#ffffff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      )
                    })}

                    {/* Create custom button */}
                    <TouchableOpacity
                      onPress={() => setCustomAnchorMode(true)}
                      activeOpacity={0.7}
                      style={{
                        width: '22%',
                        aspectRatio: 1,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: anchorsTab === 'grow' ? '#a7f3d0' : '#fde68a',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={20} color={anchorsTab === 'grow' ? '#059669' : '#d97706'} style={{ marginBottom: 2 }} />
                      <Text style={{ fontSize: 9, fontWeight: '500', color: '#6b7280' }}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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

function MoodIcon({ mood, size = 14 }: { mood?: string | null; size?: number }) {
  const ICONS: Record<string, any> = {
    grateful: Heart, joyful: Sun, inspired: Sparkles, loved: Heart,
    peaceful: Circle, calm: Circle, hopeful: Sparkles, proud: Sparkles,
  }
  const Icon = mood ? ICONS[mood] || Sun : Sun
  return <Icon size={size} color="#ffffff" strokeWidth={2.5} />
}
