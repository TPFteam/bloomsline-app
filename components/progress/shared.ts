import React from 'react'
import { View, Text, Dimensions } from 'react-native'
import {
  Sun, Moon, Coffee, Heart, Eye, Sprout, StretchHorizontal, MapPin,
  Music, Cloud, RefreshCw, List, Gift, Hand, Stars, CalendarHeart,
  Sofa, Mail, Smile, Shield, Circle, Camera, Video, Mic, PenLine,
  Droplet, Dumbbell, BookOpen, Brain, Footprints, Users, Cigarette,
  Wine, Cookie, Smartphone, Tv, Candy, Pizza, Wind, TreePine, Palette,
  Apple, Bed,
} from 'lucide-react-native'
import { type RitualCategory } from '@/lib/services/rituals'

// ── Dimensions ──────────────────────────────────────────
export const SCREEN_WIDTH = Dimensions.get('window').width

// ── Icon maps ───────────────────────────────────────────
export const RITUAL_ICON_MAP: Record<string, any> = {
  'eye': Eye, 'coffee': Coffee, 'sprout': Sprout,
  'stretch-horizontal': StretchHorizontal, 'sun': Sun, 'map-pin': MapPin,
  'music': Music, 'cloud': Cloud, 'refresh-cw': RefreshCw, 'heart': Heart,
  'list': List, 'gift': Gift, 'moon': Moon, 'hand': Hand, 'stars': Stars,
  'calendar-heart': CalendarHeart, 'sofa': Sofa, 'mail': Mail,
  'smile': Smile, 'shield': Shield,
}

export const ANCHOR_ICONS: Record<string, any> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookOpen, brain: Brain,
  bed: Bed, apple: Apple, meditation: Circle, walk: Footprints,
  social: Users, heart: Heart, sprout: Sprout, journal: PenLine,
  gratitude: Stars, nature: TreePine, creativity: Palette,
  breathing: Wind, stretch: StretchHorizontal, vegetables: Sprout, music: Music,
  cigarette: Cigarette, wine: Wine, coffee: Coffee, cookie: Cookie,
  smartphone: Smartphone, tv: Tv, candy: Candy, junkfood: Pizza,
}

// ── Category metadata ───────────────────────────────────
export const CATEGORY_META: Record<RitualCategory, {
  accent: string; lightBg: string; icon: any; label: string
}> = {
  morning:  { accent: '#f59e0b', lightBg: '#fef3c7', icon: Sun,    label: 'Morning' },
  midday:   { accent: '#059669', lightBg: '#d1fae5', icon: Coffee,  label: 'Afternoon' },
  evening:  { accent: '#6366f1', lightBg: '#e0e7ff', icon: Moon,    label: 'Evening' },
  selfcare: { accent: '#ec4899', lightBg: '#fce7f3', icon: Heart,   label: 'Self-care' },
}

// ── Mood metadata ───────────────────────────────────────
export const RITUAL_MOOD_EMOJIS: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  great:     { emoji: '\u{1F60A}', label: 'Great',     bg: '#ecfdf5', color: '#059669' },
  good:      { emoji: '\u{1F642}', label: 'Good',      bg: '#f0fdf4', color: '#22c55e' },
  okay:      { emoji: '\u{1F610}', label: 'Okay',      bg: '#fefce8', color: '#eab308' },
  low:       { emoji: '\u{1F614}', label: 'Low',        bg: '#fff7ed', color: '#f97316' },
  difficult: { emoji: '\u{1F623}', label: 'Difficult',  bg: '#fef2f2', color: '#ef4444' },
}

export const MOMENT_MOOD_COLORS: Record<string, string> = {
  grateful: '#f59e0b', peaceful: '#14b8a6', joyful: '#eab308',
  inspired: '#8b5cf6', loved: '#ec4899', calm: '#06b6d4',
  hopeful: '#22c55e', proud: '#ef4444', overwhelmed: '#f97316',
  tired: '#6b7280', uncertain: '#a78bfa',
}

// ── Moment type metadata ────────────────────────────────
export const MOMENT_TYPE_META: Record<string, { icon: any; label: string }> = {
  photo: { icon: Camera, label: 'Photos' },
  video: { icon: Video, label: 'Videos' },
  voice: { icon: Mic, label: 'Voice' },
  write: { icon: PenLine, label: 'Writing' },
}

export const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ── Types ───────────────────────────────────────────────
export type MomentRow = {
  id: string
  type: string
  moods: string[]
  created_at: string
}

export type CompletionRow = {
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

export type MemberRitualRow = {
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

export type AnchorRow = {
  id: string
  icon: string
  label_en: string
  type: 'grow' | 'letgo'
}

export type AnchorLogRow = {
  anchor_id: string
  log_date: string
}

// ── Helpers ─────────────────────────────────────────────
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function getRitualIcon(iconName: string | null, size = 20, color = '#6b7280') {
  const IconComp = RITUAL_ICON_MAP[iconName || ''] || Circle
  return React.createElement(IconComp, { size, color })
}

export function getAnchorIcon(iconName: string, size = 20, color = '#6b7280') {
  const IconComp = ANCHOR_ICONS[iconName] || Circle
  return React.createElement(IconComp, { size, color })
}

export function getGridColor(total: number): string {
  if (total === 0) return '#f0f0ee'
  if (total === 1) return '#bbf7d0'
  if (total <= 3) return '#6ee7b7'
  if (total <= 5) return '#34d399'
  return '#059669'
}

// ── Card wrapper ────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return React.createElement(View, {
    style: {
      backgroundColor: '#ffffff',
      borderRadius: 22,
      padding: 22,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 3,
      ...style,
    },
  }, children)
}
