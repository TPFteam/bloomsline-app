import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg'
import {
  Moon,
  Briefcase,
  Heart,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  Check,
  X,
  Trash2,
  Sparkles,
  ThumbsUp,
  Meh,
  Battery,
  CloudRain,
  Edit3,
  Calendar,
  TrendingUp,
  BarChart3,
  Circle as CircleIcon,
  Eye,
  Coffee,
  Sprout,
  StretchHorizontal,
  Sun,
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
  Droplet,
  Dumbbell,
  BookOpen,
  Brain,
  Footprints,
  Users,
  PenLine,
  Cigarette,
  Wine,
  Tv,
  Candy,
  Pizza,
  Wind,
  TreePine,
  Palette,
  Apple,
  Bed,
  Smartphone,
  Cookie,
} from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { fetchMemberRituals, fetchTodayCompletions, toggleCompletion, type MemberRitual, type RitualCompletion } from '@/lib/services/rituals'

// ============================================
// TYPES & CONSTANTS
// ============================================

type BalanceCategory = 'sleep' | 'work' | 'life'
type Feeling = 'great' | 'good' | 'okay' | 'tired' | 'rough'
type TabType = 'today' | 'reflect' | 'trends'

interface BalanceEntry {
  id: string
  member_id: string
  category: BalanceCategory
  activity_name: string
  duration_minutes: number
  entry_date: string
}

interface SomedayItem {
  id: string
  name: string
  description: string | null
  category: BalanceCategory
  planned_date: string | null
  estimated_minutes: number
  completed: boolean
}

interface DayConfirmation {
  id?: string
  confirmed: boolean
  feeling?: Feeling
}

interface WeeklyDay {
  date: string
  dayName: string
  sleep: number
  work: number
  life: number
  sleepTarget: number
  workTarget: number
  lifeTarget: number
  confirmed: boolean
}

const categories: {
  id: BalanceCategory
  label: string
  Icon: typeof Moon
  colors: [string, string]
  arcColor: string
  exceededColor: string
}[] = [
  { id: 'sleep', label: 'Sleep', Icon: Moon, colors: ['#8b5cf6', '#7c3aed'], arcColor: '#ddd6fe', exceededColor: '#f87171' },
  { id: 'work', label: 'Work', Icon: Briefcase, colors: ['#f59e0b', '#d97706'], arcColor: '#fcd9a8', exceededColor: '#f87171' },
  { id: 'life', label: 'Life', Icon: Heart, colors: ['#10b981', '#059669'], arcColor: '#a7f3d0', exceededColor: '#f87171' },
]

const feelings: { id: Feeling; label: string; Icon: typeof Sparkles; color: string; bg: string }[] = [
  { id: 'great', label: 'Great', Icon: Sparkles, color: '#059669', bg: '#d1fae5' },
  { id: 'good', label: 'Good', Icon: ThumbsUp, color: '#14b8a6', bg: '#ccfbf1' },
  { id: 'okay', label: 'Okay', Icon: Meh, color: '#f59e0b', bg: '#fef3c7' },
  { id: 'tired', label: 'Tired', Icon: Battery, color: '#f97316', bg: '#ffedd5' },
  { id: 'rough', label: 'Rough', Icon: CloudRain, color: '#f43f5e', bg: '#ffe4e6' },
]

const SW = Dimensions.get('window').width

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

// Anchor icon mapping
const ANCHOR_ICONS: Record<string, any> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookOpen, brain: Brain,
  bed: Bed, apple: Apple, meditation: CircleIcon, walk: Footprints,
  social: Users, heart: Heart, sprout: Sparkles, journal: PenLine,
  gratitude: Sparkles, nature: TreePine, creativity: Palette,
  breathing: Wind, stretch: Sparkles, vegetables: Sparkles, music: Music,
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

// ============================================
// HELPERS
// ============================================

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateDisplay(dateStr: string): string {
  const today = getTodayStr()
  if (dateStr === today) return 'Today'
  if (dateStr === addDays(today, -1)) return 'Yesterday'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatMinutes(mins: number): string {
  if (mins <= 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHours(mins: number): string {
  const h = mins / 60
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

function canConfirmDate(dateStr: string): boolean {
  const today = getTodayStr()
  return dateStr === today || dateStr === addDays(today, -1)
}

// ============================================
// CIRCULAR CHART COMPONENT
// ============================================

function BalanceChart({
  sleepMins,
  workMins,
  lifeMins,
  sleepTarget,
  workTarget,
  lifeTarget,
  untracked,
}: {
  sleepMins: number
  workMins: number
  lifeMins: number
  sleepTarget: number
  workTarget: number
  lifeTarget: number
  untracked: boolean
}) {
  const size = Math.min(SW - 80, 260)
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  if (untracked) {
    return (
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <Text style={{ position: 'absolute', top: size / 2 - 12, fontSize: 14, color: '#9ca3af', fontWeight: '500' }}>
          Not tracked
        </Text>
      </View>
    )
  }

  const total = sleepMins + workMins + lifeMins
  const max = Math.max(total, (sleepTarget + workTarget + lifeTarget))
  const sleepFrac = max > 0 ? sleepMins / max : 0
  const workFrac = max > 0 ? workMins / max : 0
  const lifeFrac = max > 0 ? lifeMins / max : 0

  // Starting at top (-90deg), arcs go clockwise
  const sleepDash = circumference * sleepFrac
  const workDash = circumference * workFrac
  const lifeDash = circumference * lifeFrac

  const sleepOffset = 0
  const workOffset = sleepDash
  const lifeOffset = sleepDash + workDash

  const sleepExceeded = sleepMins > sleepTarget * 60
  const workExceeded = workMins > workTarget * 60
  const lifeExceeded = lifeMins > lifeTarget * 60

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle cx={cx} cy={cy} r={radius} stroke="#f3f4f6" strokeWidth={strokeWidth} fill="none" />
        {/* Life arc */}
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke={lifeExceeded ? '#f87171' : '#a7f3d0'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${lifeDash} ${circumference - lifeDash}`}
          strokeDashoffset={-lifeOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
        {/* Work arc */}
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke={workExceeded ? '#f87171' : '#fcd9a8'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${workDash} ${circumference - workDash}`}
          strokeDashoffset={-workOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
        {/* Sleep arc */}
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke={sleepExceeded ? '#f87171' : '#ddd6fe'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${sleepDash} ${circumference - sleepDash}`}
          strokeDashoffset={-sleepOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      {/* Center text */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#171717' }}>
          {formatHours(total)}
        </Text>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>tracked</Text>
      </View>
    </View>
  )
}

// ============================================
// SIMPLE LINE CHART COMPONENT
// ============================================

function TrendsChart({
  data,
  visibleLines,
}: {
  data: { dateLabel: string; sleep: number; work: number; life: number }[]
  visibleLines: { sleep: boolean; work: boolean; life: boolean }
}) {
  if (data.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ fontSize: 14, color: '#9ca3af' }}>Not enough data for chart</Text>
      </View>
    )
  }

  const chartW = SW - 72
  const chartH = 180
  const padL = 32
  const padR = 8
  const padT = 8
  const padB = 28
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  // Find max Y
  let maxY = 0
  data.forEach(d => {
    if (visibleLines.sleep) maxY = Math.max(maxY, d.sleep)
    if (visibleLines.work) maxY = Math.max(maxY, d.work)
    if (visibleLines.life) maxY = Math.max(maxY, d.life)
  })
  maxY = Math.max(maxY, 1) // avoid division by zero
  maxY = Math.ceil(maxY / 2) * 2 // round to even

  function toX(i: number) { return padL + (i / (data.length - 1)) * plotW }
  function toY(val: number) { return padT + plotH - (val / maxY) * plotH }

  function makePoints(key: 'sleep' | 'work' | 'life') {
    return data.map((d, i) => `${toX(i)},${toY(d[key])}`).join(' ')
  }

  // Y-axis labels
  const ySteps = [0, maxY / 2, maxY]

  return (
    <View style={{ marginVertical: 12 }}>
      <Svg width={chartW} height={chartH}>
        {/* Grid lines */}
        {ySteps.map((v, i) => (
          <Line key={i} x1={padL} y1={toY(v)} x2={chartW - padR} y2={toY(v)} stroke="#f3f4f6" strokeWidth={1} />
        ))}
        {/* Y labels */}
        {ySteps.map((v, i) => (
          <SvgText key={`yl${i}`} x={padL - 4} y={toY(v) + 4} fill="#9ca3af" fontSize={10} textAnchor="end">
            {`${v}h`}
          </SvgText>
        ))}
        {/* X labels */}
        {data.map((d, i) => {
          if (data.length > 10 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null
          return (
            <SvgText key={`xl${i}`} x={toX(i)} y={chartH - 4} fill="#9ca3af" fontSize={9} textAnchor="middle">
              {d.dateLabel}
            </SvgText>
          )
        })}
        {/* Lines */}
        {visibleLines.sleep && <Polyline points={makePoints('sleep')} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinejoin="round" />}
        {visibleLines.work && <Polyline points={makePoints('work')} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinejoin="round" />}
        {visibleLines.life && <Polyline points={makePoints('life')} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />}
        {/* Dots */}
        {visibleLines.sleep && data.map((d, i) => <Circle key={`sd${i}`} cx={toX(i)} cy={toY(d.sleep)} r={3} fill="#8b5cf6" />)}
        {visibleLines.work && data.map((d, i) => <Circle key={`wd${i}`} cx={toX(i)} cy={toY(d.work)} r={3} fill="#f59e0b" />)}
        {visibleLines.life && data.map((d, i) => <Circle key={`ld${i}`} cx={toX(i)} cy={toY(d.life)} r={3} fill="#10b981" />)}
      </Svg>
    </View>
  )
}

// ============================================
// MAIN SCREEN
// ============================================

export default function BalanceScreen() {
  const { member } = useAuth()
  const router = useRouter()

  // Core state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('today')

  // Settings
  const [targetHours, setTargetHours] = useState({ sleep: 8, work: 8, life: 8 })
  const [historicalTargets, setHistoricalTargets] = useState<{ sleep: number; work: number; life: number } | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [tempTargetHours, setTempTargetHours] = useState({ sleep: 8, work: 8, life: 8 })

  // Today tab
  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [dailyMinutes, setDailyMinutes] = useState({ sleep: 0, work: 0, life: 0 })
  const [activities, setActivities] = useState<BalanceEntry[]>([])
  const [expandedCategory, setExpandedCategory] = useState<BalanceCategory | null>(null)
  const [newActivityName, setNewActivityName] = useState('')
  const [dayConfirmation, setDayConfirmation] = useState<DayConfirmation>({ confirmed: false })
  const [isEditing, setIsEditing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [oldestDate, setOldestDate] = useState<string | null>(null)

  // Someday
  const [showSomeday, setShowSomeday] = useState(false)
  const [somedayItems, setSomedayItems] = useState<SomedayItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<BalanceCategory>('life')
  const [newItemMinutes, setNewItemMinutes] = useState(60)

  // Reflect tab
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([])
  const [loadingWeekly, setLoadingWeekly] = useState(false)

  // Seeds & Rituals (in Today tab)
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [anchorLogs, setAnchorLogs] = useState<Record<string, number>>({})
  const [memberRituals, setMemberRituals] = useState<MemberRitual[]>([])
  const [ritualCompletions, setRitualCompletions] = useState<RitualCompletion[]>([])

  // Trends tab
  const [trendsRange, setTrendsRange] = useState<'6d' | '30d'>('6d')
  const [chartData, setChartData] = useState<{ dateLabel: string; sleep: number; work: number; life: number }[]>([])
  const [visibleLines, setVisibleLines] = useState({ sleep: true, work: true, life: true })
  const [loadingTrends, setLoadingTrends] = useState(false)

  // ============================================
  // DATA LOADING
  // ============================================

  const fetchSettings = useCallback(async () => {
    if (!member?.id) return
    const { data } = await supabase
      .from('balance_settings')
      .select('sleep_target, work_target, life_target')
      .eq('member_id', member.id)
      .maybeSingle()

    if (data) {
      setTargetHours({
        sleep: Math.round(data.sleep_target / 60),
        work: Math.round(data.work_target / 60),
        life: Math.round(data.life_target / 60),
      })
    }
  }, [member?.id])

  const fetchDayData = useCallback(async (dateStr: string) => {
    if (!member?.id) return

    const [entriesRes, confirmRes, histRes, oldestRes, anchorsRes, logsRes, ritualsData, completionsData] = await Promise.all([
      supabase
        .from('balance_entries')
        .select('*')
        .eq('member_id', member.id)
        .eq('entry_date', dateStr),
      supabase
        .from('day_confirmations')
        .select('id, feeling')
        .eq('member_id', member.id)
        .eq('confirmation_date', dateStr)
        .maybeSingle(),
      supabase
        .from('balance_settings_history')
        .select('sleep_target, work_target, life_target')
        .eq('member_id', member.id)
        .lte('effective_from', dateStr)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('balance_entries')
        .select('entry_date')
        .eq('member_id', member.id)
        .order('entry_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
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
      fetchMemberRituals(member.id),
      fetchTodayCompletions(member.id),
    ])

    const entries = (entriesRes.data || []) as BalanceEntry[]
    setActivities(entries)

    // Calculate daily minutes per category
    const mins = { sleep: 0, work: 0, life: 0 }
    for (const cat of ['sleep', 'work', 'life'] as BalanceCategory[]) {
      const totalEntry = entries.find(e => e.category === cat && e.activity_name === '_total')
      if (totalEntry) {
        mins[cat] = totalEntry.duration_minutes
      } else {
        mins[cat] = entries
          .filter(e => e.category === cat && e.activity_name !== '_total')
          .reduce((sum, e) => sum + e.duration_minutes, 0)
      }
    }
    setDailyMinutes(mins)

    // Confirmation
    if (confirmRes.data) {
      setDayConfirmation({ confirmed: true, feeling: confirmRes.data.feeling as Feeling, id: confirmRes.data.id })
    } else {
      setDayConfirmation({ confirmed: false })
    }
    setIsEditing(false)

    // Historical targets for this date
    if (histRes.data) {
      setHistoricalTargets({
        sleep: Math.round(histRes.data.sleep_target / 60),
        work: Math.round(histRes.data.work_target / 60),
        life: Math.round(histRes.data.life_target / 60),
      })
    } else {
      setHistoricalTargets(null)
    }

    // Oldest date
    if (oldestRes.data) {
      setOldestDate(oldestRes.data.entry_date)
    }

    // Anchors & logs
    setAnchors((anchorsRes.data ?? []) as Anchor[])
    const counts: Record<string, number> = {}
    ;(logsRes.data ?? []).forEach((l: any) => {
      counts[l.anchor_id] = (counts[l.anchor_id] || 0) + 1
    })
    setAnchorLogs(counts)

    // Rituals
    setMemberRituals(ritualsData)
    setRitualCompletions(completionsData)
  }, [member?.id])

  const fetchWeeklyData = useCallback(async () => {
    if (!member?.id) return
    setLoadingWeekly(true)

    const today = getTodayStr()
    const weekAgo = addDays(today, -6)

    const [entriesRes, confirmsRes, histRes] = await Promise.all([
      supabase
        .from('balance_entries')
        .select('*')
        .eq('member_id', member.id)
        .gte('entry_date', weekAgo)
        .lte('entry_date', today),
      supabase
        .from('day_confirmations')
        .select('confirmation_date, feeling')
        .eq('member_id', member.id)
        .gte('confirmation_date', weekAgo)
        .lte('confirmation_date', today),
      supabase
        .from('balance_settings_history')
        .select('sleep_target, work_target, life_target, effective_from')
        .eq('member_id', member.id)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false }),
    ])

    const entries = (entriesRes.data || []) as BalanceEntry[]
    const confirms = new Set((confirmsRes.data || []).map((c: any) => c.confirmation_date))
    const histSettings = (histRes.data || []) as { sleep_target: number; work_target: number; life_target: number; effective_from: string }[]

    function getTargetsForDate(date: string) {
      const match = histSettings.find(h => h.effective_from <= date)
      if (match) return { sleep: match.sleep_target / 60, work: match.work_target / 60, life: match.life_target / 60 }
      return targetHours
    }

    const days: WeeklyDay[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekAgo, i)
      const [y, m, d] = date.split('-').map(Number)
      const dayDate = new Date(y, m - 1, d)
      const dayName = dayDate.toLocaleDateString(undefined, { weekday: 'short' })
      const dayEntries = entries.filter(e => e.entry_date === date)
      const targets = getTargetsForDate(date)

      const mins = { sleep: 0, work: 0, life: 0 }
      for (const cat of ['sleep', 'work', 'life'] as BalanceCategory[]) {
        const totalEntry = dayEntries.find(e => e.category === cat && e.activity_name === '_total')
        if (totalEntry) {
          mins[cat] = totalEntry.duration_minutes
        } else {
          mins[cat] = dayEntries
            .filter(e => e.category === cat && e.activity_name !== '_total')
            .reduce((sum, e) => sum + e.duration_minutes, 0)
        }
      }

      days.push({
        date,
        dayName,
        sleep: mins.sleep / 60,
        work: mins.work / 60,
        life: mins.life / 60,
        sleepTarget: targets.sleep,
        workTarget: targets.work,
        lifeTarget: targets.life,
        confirmed: confirms.has(date),
      })
    }

    setWeeklyData(days)
    setLoadingWeekly(false)
  }, [member?.id, targetHours])

  const fetchTrendsData = useCallback(async () => {
    if (!member?.id) return
    setLoadingTrends(true)

    const today = getTodayStr()
    const days = trendsRange === '6d' ? 6 : 30
    const startDate = addDays(today, -days)

    const { data } = await supabase
      .from('balance_entries')
      .select('*')
      .eq('member_id', member.id)
      .gte('entry_date', startDate)
      .lte('entry_date', today)

    const entries = (data || []) as BalanceEntry[]
    const chart: { dateLabel: string; sleep: number; work: number; life: number }[] = []

    for (let i = 0; i <= days; i++) {
      const date = addDays(startDate, i)
      const [y, m, d] = date.split('-').map(Number)
      const dayDate = new Date(y, m - 1, d)
      const dayEntries = entries.filter(e => e.entry_date === date)

      const mins = { sleep: 0, work: 0, life: 0 }
      for (const cat of ['sleep', 'work', 'life'] as BalanceCategory[]) {
        const totalEntry = dayEntries.find(e => e.category === cat && e.activity_name === '_total')
        if (totalEntry) {
          mins[cat] = totalEntry.duration_minutes
        } else {
          mins[cat] = dayEntries
            .filter(e => e.category === cat && e.activity_name !== '_total')
            .reduce((sum, e) => sum + e.duration_minutes, 0)
        }
      }

      const label = days <= 7
        ? dayDate.toLocaleDateString(undefined, { weekday: 'short' })
        : `${dayDate.getMonth() + 1}/${dayDate.getDate()}`

      chart.push({
        dateLabel: label,
        sleep: Math.round(mins.sleep / 6) / 10,
        work: Math.round(mins.work / 6) / 10,
        life: Math.round(mins.life / 6) / 10,
      })
    }

    setChartData(chart)
    setLoadingTrends(false)
  }, [member?.id, trendsRange])

  // Initial load
  useEffect(() => {
    async function init() {
      await fetchSettings()
      await fetchDayData(getTodayStr())
      setLoading(false)
    }
    init()
  }, [fetchSettings, fetchDayData])

  // Refetch when date changes
  useEffect(() => { fetchDayData(selectedDate) }, [selectedDate, fetchDayData])

  // Fetch tab data
  useEffect(() => {
    if (activeTab === 'reflect') fetchWeeklyData()
    if (activeTab === 'trends') fetchTrendsData()
  }, [activeTab, fetchWeeklyData, fetchTrendsData])

  async function onRefresh() {
    if (activeTab === 'today') await fetchDayData(selectedDate)
    else if (activeTab === 'reflect') await fetchWeeklyData()
    else await fetchTrendsData()
  }

  // ============================================
  // MUTATIONS
  // ============================================

  async function saveSettings() {
    if (!member?.id) return
    setSaving(true)
    try {
      const payload = {
        sleep_target: tempTargetHours.sleep * 60,
        work_target: tempTargetHours.work * 60,
        life_target: tempTargetHours.life * 60,
      }

      const { data: existing } = await supabase
        .from('balance_settings')
        .select('id')
        .eq('member_id', member.id)
        .maybeSingle()

      if (existing) {
        await supabase.from('balance_settings').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('balance_settings').insert({ member_id: member.id, ...payload })
      }

      // Log to history
      await supabase.from('balance_settings_history').insert({
        member_id: member.id,
        ...payload,
        effective_from: getTodayStr(),
      })

      setTargetHours(tempTargetHours)
      setShowConfig(false)
    } catch (err) {
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  async function adjustCategoryTotal(cat: BalanceCategory, delta: number) {
    if (!member?.id || (dayConfirmation.confirmed && !isEditing)) return
    const newMins = Math.max(0, dailyMinutes[cat] + delta)

    // Find or create _total entry
    const totalEntry = activities.find(e => e.category === cat && e.activity_name === '_total')

    if (totalEntry) {
      const { error } = await supabase
        .from('balance_entries')
        .update({ duration_minutes: newMins })
        .eq('id', totalEntry.id)

      if (!error) {
        setDailyMinutes(prev => ({ ...prev, [cat]: newMins }))
        setActivities(prev => prev.map(a => a.id === totalEntry.id ? { ...a, duration_minutes: newMins } : a))
      }
    } else {
      const { data, error } = await supabase
        .from('balance_entries')
        .insert({
          member_id: member.id,
          category: cat,
          activity_name: '_total',
          duration_minutes: newMins,
          entry_date: selectedDate,
        })
        .select()
        .single()

      if (!error && data) {
        setDailyMinutes(prev => ({ ...prev, [cat]: newMins }))
        setActivities(prev => [...prev, data as BalanceEntry])
      }
    }
  }

  async function addActivity(cat: BalanceCategory) {
    if (!member?.id || !newActivityName.trim()) return

    const { data, error } = await supabase
      .from('balance_entries')
      .insert({
        member_id: member.id,
        category: cat,
        activity_name: newActivityName.trim(),
        duration_minutes: 60,
        entry_date: selectedDate,
      })
      .select()
      .single()

    if (!error && data) {
      setActivities(prev => [...prev, data as BalanceEntry])
      setNewActivityName('')
      // Recalculate if no _total
      const hasTotalEntry = activities.some(a => a.category === cat && a.activity_name === '_total')
      if (!hasTotalEntry) {
        setDailyMinutes(prev => ({ ...prev, [cat]: prev[cat] + 60 }))
      }
    }
  }

  async function adjustActivity(activityId: string, delta: number) {
    const act = activities.find(a => a.id === activityId)
    if (!act) return
    const newMins = Math.max(0, act.duration_minutes + delta)

    const { error } = await supabase
      .from('balance_entries')
      .update({ duration_minutes: newMins })
      .eq('id', activityId)

    if (!error) {
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, duration_minutes: newMins } : a))
      // Recalculate total if no _total entry
      const hasTotalEntry = activities.some(a => a.category === act.category && a.activity_name === '_total' && a.id !== activityId)
      if (!hasTotalEntry) {
        const catActivities = activities.filter(a => a.category === act.category && a.activity_name !== '_total')
        const sum = catActivities.reduce((s, a) => s + (a.id === activityId ? newMins : a.duration_minutes), 0)
        setDailyMinutes(prev => ({ ...prev, [act.category]: sum }))
      }
    }
  }

  async function deleteActivity(activityId: string) {
    const act = activities.find(a => a.id === activityId)
    if (!act) return

    const { error } = await supabase.from('balance_entries').delete().eq('id', activityId)
    if (!error) {
      const remaining = activities.filter(a => a.id !== activityId)
      setActivities(remaining)
      // Recalculate
      const hasTotalEntry = remaining.some(a => a.category === act.category && a.activity_name === '_total')
      if (!hasTotalEntry) {
        const sum = remaining
          .filter(a => a.category === act.category && a.activity_name !== '_total')
          .reduce((s, a) => s + a.duration_minutes, 0)
        setDailyMinutes(prev => ({ ...prev, [act.category]: sum }))
      }
    }
  }

  async function confirmDay(feeling: Feeling) {
    if (!member?.id) return

    const { data: existing } = await supabase
      .from('day_confirmations')
      .select('id')
      .eq('member_id', member.id)
      .eq('confirmation_date', selectedDate)
      .maybeSingle()

    if (existing) {
      await supabase.from('day_confirmations').update({ feeling }).eq('id', existing.id)
    } else {
      await supabase.from('day_confirmations').insert({
        member_id: member.id,
        confirmation_date: selectedDate,
        feeling,
      })
    }

    setDayConfirmation({ confirmed: true, feeling })
    setShowConfirmModal(false)
    setIsEditing(false)
  }

  // Someday items
  async function fetchSomedayItems() {
    if (!member?.id) return
    const { data } = await supabase
      .from('someday_items')
      .select('*')
      .eq('member_id', member.id)
      .eq('completed', false)
      .order('created_at', { ascending: false })

    setSomedayItems((data || []) as SomedayItem[])
  }

  async function addSomedayItem() {
    if (!member?.id || !newItemName.trim()) return

    const { data, error } = await supabase
      .from('someday_items')
      .insert({
        member_id: member.id,
        name: newItemName.trim(),
        category: newItemCategory,
        estimated_minutes: newItemMinutes,
      })
      .select()
      .single()

    if (!error && data) {
      setSomedayItems(prev => [data as SomedayItem, ...prev])
      setNewItemName('')
    }
  }

  async function deleteSomedayItem(id: string) {
    await supabase.from('someday_items').delete().eq('id', id)
    setSomedayItems(prev => prev.filter(i => i.id !== id))
  }

  async function moveToToday(item: SomedayItem) {
    if (!member?.id) return
    // Add as activity today
    const { data, error } = await supabase
      .from('balance_entries')
      .insert({
        member_id: member.id,
        category: item.category,
        activity_name: item.name,
        duration_minutes: item.estimated_minutes,
        entry_date: getTodayStr(),
      })
      .select()
      .single()

    if (!error && data) {
      // Mark complete
      await supabase.from('someday_items').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', item.id)
      setSomedayItems(prev => prev.filter(i => i.id !== item.id))
      // Refresh day data if viewing today
      if (selectedDate === getTodayStr()) await fetchDayData(selectedDate)
    }
  }

  // Anchor logging
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

  // Ritual quick-toggle
  async function handleToggleRitual(ritualId: string) {
    if (!member?.id) return
    const existing = ritualCompletions.find(c => c.ritual_id === ritualId)
    const newCompleted = !existing?.completed
    // Optimistic update
    if (existing) {
      setRitualCompletions(prev => prev.map(c => c.ritual_id === ritualId ? { ...c, completed: newCompleted } : c))
    } else {
      setRitualCompletions(prev => [...prev, { ritual_id: ritualId, completed: true } as RitualCompletion])
    }
    await toggleCompletion(member.id, ritualId, existing)
  }

  // ============================================
  // NAVIGATION
  // ============================================

  function goToDate(dir: number) {
    const next = addDays(selectedDate, dir)
    const today = getTodayStr()
    if (next > today) return
    const earliest = oldestDate ? (oldestDate < addDays(today, -30) ? oldestDate : addDays(today, -30)) : addDays(today, -30)
    if (next < earliest) return
    setSelectedDate(next)
  }

  const canGoBack = (() => {
    const today = getTodayStr()
    const earliest = oldestDate ? (oldestDate < addDays(today, -30) ? oldestDate : addDays(today, -30)) : addDays(today, -30)
    return selectedDate > earliest
  })()

  const canGoForward = selectedDate < getTodayStr()

  // Effective targets (historical or current)
  const effectiveTargets = historicalTargets || targetHours

  // Is this an old unconfirmed day?
  const isOldUntracked = selectedDate < getTodayStr() && !dayConfirmation.confirmed && activities.length === 0

  const isEditable = !dayConfirmation.confirmed || isEditing

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
      }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#171717' }}>Balance</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => { fetchSomedayItems(); setShowSomeday(true) }} style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setTempTargetHours(targetHours); setShowConfig(true) }} style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
        backgroundColor: '#f3f4f6', borderRadius: 14, padding: 3,
      }}>
        {([
          { id: 'today' as TabType, label: 'Today', Icon: Calendar },
          { id: 'reflect' as TabType, label: 'Reflect', Icon: BarChart3 },
          { id: 'trends' as TabType, label: 'Trends', Icon: TrendingUp },
        ]).map((tab) => {
          const active = activeTab === tab.id
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingVertical: 10, borderRadius: 12,
                backgroundColor: active ? '#fff' : 'transparent',
              }}
            >
              <tab.Icon size={16} color={active ? '#171717' : '#9ca3af'} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#171717' : '#9ca3af' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ============================================ */}
      {/* TODAY TAB */}
      {/* ============================================ */}
      {activeTab === 'today' && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        >
          {/* Date navigation */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <TouchableOpacity onPress={() => goToDate(-1)} disabled={!canGoBack} style={{ opacity: canGoBack ? 1 : 0.3, padding: 8 }}>
              <ChevronLeft size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717' }}>
              {formatDateDisplay(selectedDate)}
            </Text>
            <TouchableOpacity onPress={() => goToDate(1)} disabled={!canGoForward} style={{ opacity: canGoForward ? 1 : 0.3, padding: 8 }}>
              <ChevronRight size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Circular chart */}
          <BalanceChart
            sleepMins={dailyMinutes.sleep}
            workMins={dailyMinutes.work}
            lifeMins={dailyMinutes.life}
            sleepTarget={effectiveTargets.sleep}
            workTarget={effectiveTargets.work}
            lifeTarget={effectiveTargets.life}
            untracked={isOldUntracked}
          />

          {/* Day confirmation badge/button */}
          {dayConfirmation.confirmed && dayConfirmation.feeling ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {(() => {
                const f = feelings.find(fl => fl.id === dayConfirmation.feeling)
                if (!f) return null
                return (
                  <TouchableOpacity
                    onPress={() => canConfirmDate(selectedDate) ? setShowConfirmModal(true) : null}
                    activeOpacity={canConfirmDate(selectedDate) ? 0.7 : 1}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: f.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
                    }}
                  >
                    <f.Icon size={16} color={f.color} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: f.color }}>{f.label}</Text>
                    <Check size={14} color={f.color} />
                  </TouchableOpacity>
                )
              })()}
              {dayConfirmation.confirmed && !isEditing && canConfirmDate(selectedDate) && (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 6 }}>
                  <Edit3 size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          ) : canConfirmDate(selectedDate) ? (
            <TouchableOpacity
              onPress={() => setShowConfirmModal(true)}
              style={{
                alignSelf: 'center', marginBottom: 16,
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: '#ecfdf5', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12,
              }}
            >
              <Check size={18} color="#059669" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' }}>Confirm this day</Text>
            </TouchableOpacity>
          ) : null}

          {/* Category cards */}
          {categories.map((cat) => {
            const mins = dailyMinutes[cat.id]
            const target = effectiveTargets[cat.id]
            const expanded = expandedCategory === cat.id
            const catActivities = activities.filter(
              a => a.category === cat.id && a.activity_name !== '_total' && a.activity_name !== '_general' && a.activity_name !== '_default'
            )

            return (
              <View key={cat.id} style={{
                backgroundColor: '#fff', borderRadius: 20, marginBottom: 12,
                borderWidth: 1, borderColor: '#f3f4f6',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
                overflow: 'hidden',
              }}>
                {/* Category header */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedCategory(expanded ? null : cat.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}
                >
                  <LinearGradient
                    colors={cat.colors}
                    style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <cat.Icon size={22} color="#fff" />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717' }}>{cat.label}</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>Target: {target}h</Text>
                  </View>

                  {/* +/- controls */}
                  {isEditable && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => adjustCategoryTotal(cat.id, -30)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={14} color="#374151" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717', minWidth: 48, textAlign: 'center' }}>
                        {formatHours(mins)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => adjustCategoryTotal(cat.id, 30)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={14} color="#374151" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {!isEditable && (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717' }}>
                      {formatHours(mins)}
                    </Text>
                  )}

                  {expanded ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
                </TouchableOpacity>

                {/* Expanded activities */}
                {expanded && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                    {catActivities.length === 0 && !isEditable && (
                      <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 }}>
                        No activities logged
                      </Text>
                    )}

                    {catActivities.map((act) => (
                      <View key={act.id} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        backgroundColor: '#f9fafb', borderRadius: 12, padding: 12,
                      }}>
                        <Text style={{ flex: 1, fontSize: 14, color: '#374151' }}>{act.activity_name}</Text>
                        {isEditable ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <TouchableOpacity
                              onPress={() => adjustActivity(act.id, -15)}
                              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Minus size={12} color="#374151" />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#171717', minWidth: 40, textAlign: 'center' }}>
                              {formatMinutes(act.duration_minutes)}
                            </Text>
                            <TouchableOpacity
                              onPress={() => adjustActivity(act.id, 15)}
                              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Plus size={12} color="#374151" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteActivity(act.id)} style={{ padding: 4, marginLeft: 4 }}>
                              <Trash2 size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 13, fontWeight: '500', color: '#6b7280' }}>
                            {formatMinutes(act.duration_minutes)}
                          </Text>
                        )}
                      </View>
                    ))}

                    {/* Add activity input */}
                    {isEditable && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <TextInput
                          value={newActivityName}
                          onChangeText={setNewActivityName}
                          placeholder="Add activity..."
                          placeholderTextColor="#d1d5db"
                          onSubmitEditing={() => addActivity(cat.id)}
                          returnKeyType="done"
                          style={{
                            flex: 1, fontSize: 14, color: '#374151', padding: 10,
                            backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => addActivity(cat.id)}
                          disabled={!newActivityName.trim()}
                          style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: newActivityName.trim() ? cat.colors[0] : '#e5e7eb',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Plus size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )
          })}

          {/* ===== MY LITTLE STEPS (SEEDS) ===== */}
          {anchors.length > 0 && (
            <View style={{
              backgroundColor: '#fff', borderRadius: 20, marginBottom: 12,
              borderWidth: 1, borderColor: '#f3f4f6', padding: 16,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <LinearGradient
                    colors={['#fbbf24', '#f97316']}
                    style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Sparkles size={16} color="#ffffff" />
                  </LinearGradient>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717' }}>My Little Steps</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>
                  {Object.values(anchorLogs).reduce((s, c) => s + c, 0)} logged
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 8 }}>
                {anchors.map((anchor) => {
                  const count = anchorLogs[anchor.id] ?? 0
                  const isGrow = anchor.type === 'grow'
                  const IconComponent = ANCHOR_ICONS[anchor.icon] || CircleIcon

                  return (
                    <TouchableOpacity
                      key={anchor.id}
                      onPress={() => selectedDate === getTodayStr() ? logAnchor(anchor.id) : null}
                      activeOpacity={selectedDate === getTodayStr() ? 0.7 : 1}
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
                        opacity: selectedDate === getTodayStr() ? 1 : 0.6,
                      }}
                    >
                      <IconComponent size={22} color={isGrow ? '#059669' : '#d97706'} style={{ marginBottom: 3 }} />
                      <Text style={{ fontSize: 9, color: '#6b7280', fontWeight: '500', textAlign: 'center', paddingHorizontal: 2 }} numberOfLines={1}>
                        {anchor.label_en}
                      </Text>
                      {count > 0 && (
                        <View style={{
                          position: 'absolute', top: -5, right: -5,
                          backgroundColor: isGrow ? '#059669' : '#fbbf24',
                          borderRadius: 10, minWidth: 18, height: 18,
                          alignItems: 'center', justifyContent: 'center',
                          paddingHorizontal: 3,
                        }}>
                          <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: '700' }}>{count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {selectedDate === getTodayStr() && (
                <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>
                  Tap to log
                </Text>
              )}
            </View>
          )}

          {/* ===== UPCOMING RITUALS ===== */}
          {memberRituals.length > 0 && (() => {
            const completedIds = new Set(ritualCompletions.filter(c => c.completed).map(c => c.ritual_id))
            const upcoming = memberRituals.filter(mr => !completedIds.has(mr.ritual_id))
            const completedCount = memberRituals.length - upcoming.length

            return (
              <View style={{
                backgroundColor: '#fff', borderRadius: 20, marginBottom: 12,
                borderWidth: 1, borderColor: '#f3f4f6', padding: 16,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <LinearGradient
                      colors={['#34d399', '#059669']}
                      style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <CircleIcon size={16} color="#ffffff" />
                    </LinearGradient>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717' }}>Rituals</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>
                    {completedCount}/{memberRituals.length} done
                  </Text>
                </View>

                {upcoming.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>🎉</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>All done for today!</Text>
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    {upcoming.slice(0, 4).map((mr) => {
                      const cat = RITUAL_CATEGORY_COLORS[mr.ritual.category] || RITUAL_CATEGORY_COLORS.morning
                      const IconComp = RITUAL_ICONS[mr.ritual.icon || ''] || Heart
                      const timeStr = mr.planned_time ? mr.planned_time.slice(0, 5) : ''

                      return (
                        <TouchableOpacity
                          key={mr.id}
                          activeOpacity={0.7}
                          onPress={() => selectedDate === getTodayStr() ? handleToggleRitual(mr.ritual_id) : null}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            backgroundColor: '#f9fafb', borderRadius: 14, padding: 12,
                          }}
                        >
                          <View style={{
                            width: 34, height: 34, borderRadius: 10,
                            backgroundColor: cat.bg, alignItems: 'center', justifyContent: 'center',
                          }}>
                            <IconComp size={16} color={cat.accent} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#171717' }} numberOfLines={1}>
                              {mr.ritual.name}
                            </Text>
                            {timeStr ? (
                              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{timeStr}</Text>
                            ) : null}
                          </View>
                          {mr.ritual.duration_suggestion ? (
                            <View style={{ backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>{mr.ritual.duration_suggestion}m</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      )
                    })}
                    {upcoming.length > 4 && (
                      <TouchableOpacity
                        onPress={() => router.push('/(tabs)/rituals' as any)}
                        style={{ alignItems: 'center', paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>
                          +{upcoming.length - 4} more
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Completed rituals */}
                {completedCount > 0 && upcoming.length > 0 && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 6 }}>
                    {memberRituals.filter(mr => completedIds.has(mr.ritual_id)).slice(0, 3).map((mr) => (
                        <View
                          key={mr.id}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, opacity: 0.6,
                          }}
                        >
                          <View style={{
                            width: 34, height: 34, borderRadius: 10,
                            backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={16} color="#059669" />
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '500', color: '#9ca3af', textDecorationLine: 'line-through', flex: 1 }} numberOfLines={1}>
                            {mr.ritual.name}
                          </Text>
                        </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })()}
        </ScrollView>
      )}

      {/* ============================================ */}
      {/* REFLECT TAB */}
      {/* ============================================ */}
      {activeTab === 'reflect' && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={loadingWeekly} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        >
          {loadingWeekly ? (
            <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 60 }} />
          ) : (
            <>
              {/* Bloom insight card */}
              {(() => {
                const confirmedDays = weeklyData.filter(d => d.confirmed || (d.sleep + d.work + d.life) > 0)
                if (confirmedDays.length === 0) return null
                const avgSleep = confirmedDays.reduce((s, d) => s + d.sleep, 0) / confirmedDays.length
                const avgWork = confirmedDays.reduce((s, d) => s + d.work, 0) / confirmedDays.length
                const avgLife = confirmedDays.reduce((s, d) => s + d.life, 0) / confirmedDays.length

                let message = ''
                if (avgSleep >= 7 && avgWork <= 9 && avgLife >= 2) {
                  message = 'You\'re maintaining a lovely balance this week. Keep nurturing all three areas of your life.'
                } else if (avgWork > 10) {
                  message = 'Your week looks work-heavy. Remember to carve out time for rest and the things that bring you joy.'
                } else if (avgSleep < 6) {
                  message = 'Your sleep could use some attention. Even small improvements in rest can make a big difference.'
                } else if (avgLife < 1) {
                  message = 'You\'ve been very busy. Don\'t forget to make time for the activities that fill your cup.'
                } else {
                  message = 'You\'re doing your best, and that\'s what matters. Small, consistent steps lead to lasting balance.'
                }

                return (
                  <View style={{
                    backgroundColor: '#faf5ff', borderRadius: 20, padding: 20, marginBottom: 20,
                    borderWidth: 1, borderColor: '#ede9fe',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Sparkles size={18} color="#8b5cf6" />
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#7c3aed' }}>Bloom Insight</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#4c1d95', lineHeight: 22 }}>{message}</Text>
                  </View>
                )
              })()}

              {/* Weekly summary cards */}
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717', marginBottom: 12 }}>
                This Week
              </Text>

              {categories.map((cat) => {
                const confirmedDays = weeklyData.filter(d => d.confirmed || (d.sleep + d.work + d.life) > 0)
                if (confirmedDays.length === 0) return null
                const avg = confirmedDays.reduce((s, d) => s + d[cat.id], 0) / confirmedDays.length
                const avgTarget = confirmedDays.reduce((s, d) => s + (d[`${cat.id}Target` as keyof WeeklyDay] as number), 0) / confirmedDays.length
                const ratio = avgTarget > 0 ? avg / avgTarget : 0

                let status = ''
                let statusColor = '#059669'
                let statusBg = '#d1fae5'

                if (cat.id === 'sleep') {
                  if (ratio >= 0.9) { status = 'Well rested'; statusColor = '#059669'; statusBg = '#d1fae5' }
                  else if (ratio >= 0.7) { status = 'Room to grow'; statusColor = '#f59e0b'; statusBg = '#fef3c7' }
                  else { status = 'Needs attention'; statusColor = '#f43f5e'; statusBg = '#ffe4e6' }
                } else if (cat.id === 'work') {
                  if (ratio >= 0.9 && ratio <= 1.1) { status = 'Balanced'; statusColor = '#059669'; statusBg = '#d1fae5' }
                  else if (ratio > 1.1) { status = 'Overworking'; statusColor = '#f43f5e'; statusBg = '#ffe4e6' }
                  else { status = 'Under target'; statusColor = '#f59e0b'; statusBg = '#fef3c7' }
                } else {
                  if (ratio >= 0.8) { status = 'Thriving'; statusColor = '#059669'; statusBg = '#d1fae5' }
                  else if (ratio >= 0.5) { status = 'Growing'; statusColor = '#f59e0b'; statusBg = '#fef3c7' }
                  else { status = 'Needs love'; statusColor = '#f43f5e'; statusBg = '#ffe4e6' }
                }

                return (
                  <View key={cat.id} style={{
                    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10,
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    borderWidth: 1, borderColor: '#f3f4f6',
                  }}>
                    <LinearGradient
                      colors={cat.colors}
                      style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <cat.Icon size={22} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717' }}>{cat.label}</Text>
                        <View style={{ backgroundColor: statusBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor }}>{status}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        Avg {avg.toFixed(1)}h / {avgTarget.toFixed(0)}h target
                      </Text>
                    </View>
                  </View>
                )
              })}

              {weeklyData.filter(d => d.confirmed || (d.sleep + d.work + d.life) > 0).length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717' }}>No data this week</Text>
                  <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Start tracking your days to see insights.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ============================================ */}
      {/* TRENDS TAB */}
      {/* ============================================ */}
      {activeTab === 'trends' && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={loadingTrends} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        >
          {/* Time range selector */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {([
              { id: '6d' as const, label: '6 Days' },
              { id: '30d' as const, label: '30 Days' },
            ]).map((r) => {
              const active = trendsRange === r.id
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setTrendsRange(r.id)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
                    backgroundColor: active ? '#8b5cf6' : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#6b7280' }}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Line toggles */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {categories.map((cat) => {
              const visible = visibleLines[cat.id]
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setVisibleLines(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                    backgroundColor: visible ? cat.arcColor : '#f3f4f6',
                    borderWidth: visible ? 2 : 0,
                    borderColor: visible ? cat.colors[0] : 'transparent',
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: visible ? cat.colors[0] : '#d1d5db' }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: visible ? cat.colors[0] : '#9ca3af' }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Chart */}
          {loadingTrends ? (
            <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
          ) : (
            <View style={{
              backgroundColor: '#fff', borderRadius: 20, padding: 16,
              borderWidth: 1, borderColor: '#f3f4f6',
            }}>
              <TrendsChart data={chartData} visibleLines={visibleLines} />
            </View>
          )}
        </ScrollView>
      )}

      {/* ============================================ */}
      {/* CONFIRM DAY MODAL */}
      {/* ============================================ */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowConfirmModal(false)}>
          <Pressable style={{
            backgroundColor: '#fff', borderRadius: 24, padding: 24, width: SW - 48,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717', textAlign: 'center', marginBottom: 4 }}>
              How was your day?
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>
              {formatDateDisplay(selectedDate)}
            </Text>
            <View style={{ gap: 8 }}>
              {feelings.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => confirmDay(f.id)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    padding: 14, borderRadius: 16,
                    backgroundColor: dayConfirmation.feeling === f.id ? f.bg : '#f9fafb',
                    borderWidth: dayConfirmation.feeling === f.id ? 2 : 1,
                    borderColor: dayConfirmation.feeling === f.id ? f.color : '#f3f4f6',
                  }}
                >
                  <f.Icon size={22} color={f.color} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717' }}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================ */}
      {/* SETTINGS MODAL */}
      {/* ============================================ */}
      <Modal visible={showConfig} transparent animationType="fade" onRequestClose={() => setShowConfig(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowConfig(false)}>
          <Pressable style={{
            backgroundColor: '#fff', borderRadius: 24, padding: 24, width: SW - 48,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717', textAlign: 'center', marginBottom: 4 }}>
              Daily Targets
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>
              {24 - tempTargetHours.sleep - tempTargetHours.work - tempTargetHours.life}h remaining of 24h
            </Text>

            {categories.map((cat) => {
              const val = tempTargetHours[cat.id]
              const total = tempTargetHours.sleep + tempTargetHours.work + tempTargetHours.life
              return (
                <View key={cat.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                }}>
                  <LinearGradient
                    colors={cat.colors}
                    style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <cat.Icon size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#171717' }}>{cat.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setTempTargetHours(prev => ({ ...prev, [cat.id]: Math.max(0, prev[cat.id] - 1) }))}
                      style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Minus size={14} color="#374151" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717', minWidth: 36, textAlign: 'center' }}>
                      {val}h
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (total < 24) setTempTargetHours(prev => ({ ...prev, [cat.id]: prev[cat.id] + 1 }))
                      }}
                      disabled={total >= 24}
                      style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: total >= 24 ? '#e5e7eb' : '#f3f4f6',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} color={total >= 24 ? '#d1d5db' : '#374151'} />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setShowConfig(false)}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: '#f3f4f6', alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveSettings}
                disabled={saving}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#8b5cf6', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                  {saving ? 'Saving...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================ */}
      {/* SOMEDAY ITEMS MODAL */}
      {/* ============================================ */}
      <Modal visible={showSomeday} animationType="slide" onRequestClose={() => setShowSomeday(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', padding: 16,
            borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff',
          }}>
            <TouchableOpacity onPress={() => setShowSomeday(false)} style={{ padding: 4, marginRight: 12 }}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717', flex: 1 }}>Someday</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {/* Add new item */}
            <View style={{
              backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 20,
              borderWidth: 1, borderColor: '#f3f4f6',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 }}>Add new item</Text>
              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="What would you like to do someday?"
                placeholderTextColor="#d1d5db"
                style={{
                  fontSize: 14, color: '#374151', padding: 12,
                  backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
                  marginBottom: 10,
                }}
              />

              {/* Category selector */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {categories.map((cat) => {
                  const selected = newItemCategory === cat.id
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setNewItemCategory(cat.id)}
                      style={{
                        flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                        backgroundColor: selected ? cat.arcColor : '#f3f4f6',
                        borderWidth: selected ? 2 : 0,
                        borderColor: selected ? cat.colors[0] : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? cat.colors[0] : '#9ca3af' }}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Duration selector */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Time:</Text>
                {[15, 30, 60, 120].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setNewItemMinutes(m)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: newItemMinutes === m ? '#8b5cf6' : '#f3f4f6',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: newItemMinutes === m ? '#fff' : '#6b7280' }}>
                      {formatMinutes(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={addSomedayItem}
                disabled={!newItemName.trim()}
                style={{
                  paddingVertical: 12, borderRadius: 12,
                  backgroundColor: newItemName.trim() ? '#8b5cf6' : '#e5e7eb',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Items list */}
            {somedayItems.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>No someday items yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {somedayItems.map((item) => {
                  const catObj = categories.find(c => c.id === item.category)
                  return (
                    <View key={item.id} style={{
                      backgroundColor: '#fff', borderRadius: 16, padding: 14,
                      borderWidth: 1, borderColor: '#f3f4f6',
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <View style={{
                            backgroundColor: catObj?.arcColor || '#f3f4f6', borderRadius: 6,
                            paddingHorizontal: 6, paddingVertical: 2,
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: catObj?.colors[0] || '#6b7280' }}>
                              {catObj?.label}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#9ca3af' }}>{formatMinutes(item.estimated_minutes)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => moveToToday(item)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: '#ecfdf5',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>Today</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteSomedayItem(item.id)} style={{ padding: 4 }}>
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
