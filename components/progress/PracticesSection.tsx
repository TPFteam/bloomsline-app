import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Flame, ChevronDown, ChevronUp } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import RitualCard from './RitualCard'
import {
  Card,
  CATEGORY_META,
  getRitualIcon,
  type MemberRitualRow,
} from './shared'
import { type RitualCategory } from '@/lib/services/rituals'

type Props = {
  index: number
  memberRituals: MemberRitualRow[]
  weekDays: string[]
  today: string
  ritualDayDetail: Record<string, Record<string, { duration: number | null }>>
  ritualStats: Record<string, { currentStreak: number; daysCompleted: number }>
}

export default function PracticesSection({
  index,
  memberRituals,
  weekDays,
  today,
  ritualDayDetail,
  ritualStats,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  // Best streak across all rituals
  const bestStreak = Math.max(0, ...memberRituals.map(r => ritualStats[r.ritual_id]?.currentStreak ?? 0))
  // Total days active this week (any ritual done)
  const weekActiveDays = weekDays.filter(d =>
    memberRituals.some(r => !!(ritualDayDetail[r.ritual_id] || {})[d])
  ).length

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="Your practices" subtitle={`${memberRituals.length} active ritual${memberRituals.length !== 1 ? 's' : ''}`} isDark={false} accentColor="#f59e0b" />

        {/* Summary: compact row per ritual */}
        {memberRituals.map(r => {
          const cat = r.ritual?.category || 'morning'
          const meta = CATEGORY_META[cat as RitualCategory] || CATEGORY_META.morning
          const dayDetail = ritualDayDetail[r.ritual_id] || {}
          const stats = ritualStats[r.ritual_id] || { currentStreak: 0, daysCompleted: 0 }

          return (
            <View key={r.id} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
            }}>
              {/* Icon */}
              <View style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: meta.lightBg,
                alignItems: 'center', justifyContent: 'center', marginRight: 10,
              }}>
                {getRitualIcon(r.ritual.icon, 15, meta.accent)}
              </View>

              {/* Name */}
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', color: '#1a1a1a', flex: 1 }}>
                {r.ritual.name}
              </Text>

              {/* Mini week dots */}
              <View style={{ flexDirection: 'row', gap: 3, marginRight: 10 }}>
                {weekDays.map((dayStr, i) => {
                  const done = !!dayDetail[dayStr]
                  const isToday = dayStr === today
                  return (
                    <View key={i} style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: done ? meta.accent : '#e5e7eb',
                      ...(isToday && !done ? { borderWidth: 1, borderColor: meta.accent } : {}),
                    }} />
                  )
                })}
              </View>

              {/* Streak badge */}
              {stats.currentStreak >= 2 && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 2,
                  backgroundColor: `${meta.accent}12`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
                }}>
                  <Flame size={11} color={meta.accent} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: meta.accent }}>{stats.currentStreak}</Text>
                </View>
              )}
            </View>
          )
        })}

        {/* Footer: summary stat + expand toggle */}
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 14,
          }}
        >
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>
            {weekActiveDays === 7 ? 'Active every day this week'
              : weekActiveDays > 0 ? `Active ${weekActiveDays} of 7 days this week`
              : 'Not yet this week'
            }
            {bestStreak >= 2 ? ` \u00b7 best streak ${bestStreak}d` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>
              {expanded ? 'Less' : 'See all'}
            </Text>
            {expanded
              ? <ChevronUp size={16} color="#059669" />
              : <ChevronDown size={16} color="#059669" />
            }
          </View>
        </TouchableOpacity>
      </Card>

      {/* Expanded: full individual cards */}
      {expanded && memberRituals.map((r, i) => (
        <RitualCard
          key={r.id}
          index={index + 1 + i}
          ritual={r}
          weekDays={weekDays}
          today={today}
          dayDetail={ritualDayDetail[r.ritual_id] || {}}
          stats={ritualStats[r.ritual_id] || { currentStreak: 0, daysCompleted: 0 }}
        />
      ))}
    </AnimatedSection>
  )
}
