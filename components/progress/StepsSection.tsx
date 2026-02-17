import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Flame, ChevronDown, ChevronUp } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import AnchorCard from './AnchorCard'
import { Card, getAnchorIcon, type AnchorRow } from './shared'

type Props = {
  index: number
  anchors: AnchorRow[]
  weekDays: string[]
  today: string
  anchorLogMap: Record<string, Record<string, number>>
  anchorStats: Record<string, { currentStreak: number; last30: number }>
}

export default function StepsSection({
  index,
  anchors,
  weekDays,
  today,
  anchorLogMap,
  anchorStats,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const bestStreak = Math.max(0, ...anchors.map(a => anchorStats[a.id]?.currentStreak ?? 0))
  const weekActiveDays = weekDays.filter(d =>
    anchors.some(a => !!(anchorLogMap[a.id] || {})[d])
  ).length

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="Your little steps" subtitle={`${anchors.length} active seed${anchors.length !== 1 ? 's' : ''}`} isDark={false} accentColor="#059669" />

        {/* Summary: compact row per anchor */}
        {anchors.map(anchor => {
          const isGrow = anchor.type === 'grow'
          const accent = isGrow ? '#059669' : '#d97706'
          const lightBg = isGrow ? '#d1fae5' : '#fef3c7'
          const dateCounts = anchorLogMap[anchor.id] || {}
          const stats = anchorStats[anchor.id] || { currentStreak: 0, last30: 0 }

          return (
            <View key={anchor.id} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
            }}>
              {/* Icon */}
              <View style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: lightBg,
                alignItems: 'center', justifyContent: 'center', marginRight: 10,
              }}>
                {getAnchorIcon(anchor.icon, 15, accent)}
              </View>

              {/* Name */}
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', color: '#1a1a1a', flex: 1 }}>
                {anchor.label_en}
              </Text>

              {/* Mini week dots */}
              <View style={{ flexDirection: 'row', gap: 3, marginRight: 10 }}>
                {weekDays.map((dayStr, i) => {
                  const done = !!dateCounts[dayStr]
                  const isToday = dayStr === today
                  return (
                    <View key={i} style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: done ? accent : '#e5e7eb',
                      ...(isToday && !done ? { borderWidth: 1, borderColor: accent } : {}),
                    }} />
                  )
                })}
              </View>

              {/* Streak badge */}
              {stats.currentStreak >= 2 && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 2,
                  backgroundColor: `${accent}12`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
                }}>
                  <Flame size={11} color={accent} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>{stats.currentStreak}</Text>
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
      {expanded && anchors.map((anchor, i) => (
        <AnchorCard
          key={anchor.id}
          index={index + 1 + i}
          anchor={anchor}
          weekDays={weekDays}
          today={today}
          dateCounts={anchorLogMap[anchor.id] || {}}
          stats={anchorStats[anchor.id] || { currentStreak: 0, last30: 0 }}
        />
      ))}
    </AnimatedSection>
  )
}
