import React from 'react'
import { View, Dimensions } from 'react-native'
import {
  Circle, Heart, BookOpen, Dumbbell, Droplet, Coffee, Brain, Footprints,
  Users, PenLine, Cigarette, Wine, Cookie, Smartphone, Tv, Candy, Pizza,
  Wind, TreePine, Palette, Apple, Bed, Music, StretchHorizontal, Sparkles,
} from 'lucide-react-native'

export const SCREEN_WIDTH = Dimensions.get('window').width

export const ANCHOR_ICONS: Record<string, any> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookOpen, brain: Brain,
  bed: Bed, apple: Apple, meditation: Circle, walk: Footprints,
  social: Users, heart: Heart, sprout: Sparkles, journal: PenLine,
  gratitude: Sparkles, nature: TreePine, creativity: Palette,
  breathing: Wind, stretch: StretchHorizontal, vegetables: Sparkles, music: Music,
  cigarette: Cigarette, wine: Wine, coffee: Coffee, cookie: Cookie,
  smartphone: Smartphone, tv: Tv, candy: Candy, junkfood: Pizza,
}

export const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ── Types ───────────────────────────────────────────────
export type Anchor = {
  id: string
  icon: string
  label_en: string
  label_fr: string
  type: 'grow' | 'letgo'
}

export type AnchorLog = {
  anchor_id: string
  log_date: string
}

export type ActivityLog = {
  id: string
  anchor_icon: string
  anchor_label_en: string
  anchor_type: 'grow' | 'letgo'
  action: 'added' | 'removed' | 'reactivated'
  created_at: string
}

export type AnchorStats = {
  total: number
  currentStreak: number
  bestStreak: number
  last30: number
  weekTotal: number
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

export function getMonthColor(grow: number, letgo: number): string {
  const total = grow + letgo
  if (total === 0) return '#f0f0ee'
  if (grow > letgo) {
    if (total === 1) return '#bbf7d0'
    if (total <= 3) return '#6ee7b7'
    if (total <= 5) return '#34d399'
    return '#059669'
  }
  if (letgo > grow) {
    if (total === 1) return '#fde68a'
    if (total <= 3) return '#fbbf24'
    if (total <= 5) return '#f59e0b'
    return '#d97706'
  }
  if (total <= 2) return '#99f6e4'
  if (total <= 4) return '#5eead4'
  return '#2dd4bf'
}

export function getAnchorIcon(iconName: string, size = 20, color = '#6b7280') {
  const IconComp = ANCHOR_ICONS[iconName] || Circle
  return React.createElement(IconComp, { size, color })
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
