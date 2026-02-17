import { View, Text, TouchableOpacity } from 'react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import {
  Card,
  SCREEN_WIDTH,
  CATEGORY_META,
  RITUAL_MOOD_EMOJIS,
  getGridColor,
  getRitualIcon,
  getAnchorIcon,
  type CompletionRow,
  type MomentRow,
  type AnchorRow,
} from './shared'
import { type RitualCategory } from '@/lib/services/rituals'

type Props = {
  index: number
  monthDays: string[]
  today: string
  dayActivityCounts: Record<string, { rituals: number; seeds: number; moments: number }>
  expandedDay: string | null
  setExpandedDay: (day: string | null) => void
  ritualCompletionsByDate: Record<string, CompletionRow[]>
  anchorLogsByDate: Record<string, Set<string>>
  momentsByDate: Record<string, MomentRow[]>
  anchors: AnchorRow[]
}

export default function ActivityGrid({
  index,
  monthDays,
  today,
  dayActivityCounts,
  expandedDay,
  setExpandedDay,
  ritualCompletionsByDate,
  anchorLogsByDate,
  momentsByDate,
  anchors,
}: Props) {
  const GAP = 6
  // page padding (22*2) + card padding (22*2) = 88
  const availableWidth = SCREEN_WIDTH - 88
  const cellSize = Math.floor((availableWidth - GAP * 6) / 7)

  const rows: string[][] = []
  for (let i = 0; i < monthDays.length; i += 7) {
    rows.push(monthDays.slice(i, i + 7))
  }

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="The bigger picture" subtitle="Your last 30 days" isDark={false} accentColor="#059669" />

        {/* 30-day grid */}
        <View style={{ gap: GAP }}>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: GAP }}>
              {row.map(dayStr => {
                const act = dayActivityCounts[dayStr]
                const total = act ? act.rituals + act.seeds + act.moments : 0
                const isToday = dayStr === today
                const dayNum = parseInt(dayStr.split('-')[2], 10)

                return (
                  <TouchableOpacity
                    key={dayStr}
                    onPress={() => setExpandedDay(expandedDay === dayStr ? null : dayStr)}
                    activeOpacity={0.7}
                    style={{
                      width: cellSize, height: cellSize, borderRadius: 10,
                      backgroundColor: getGridColor(total),
                      borderWidth: expandedDay === dayStr ? 2 : 0,
                      borderColor: '#9ca3af',
                      alignItems: 'center', justifyContent: 'center',
                      // Today cell glow
                      ...(isToday ? {
                        shadowColor: '#059669',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 6,
                      } : {}),
                    }}
                  >
                    <Text style={{
                      fontSize: 10, fontWeight: isToday ? '700' : '500',
                      color: total >= 4 ? '#ffffff' : '#78716c',
                    }}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>

        {/* Legend: rounded pill style */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 4 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af', marginRight: 4 }}>Less</Text>
          {['#f0f0ee', '#bbf7d0', '#6ee7b7', '#34d399', '#059669'].map((c, i) => (
            <View key={i} style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: c }} />
          ))}
          <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>More</Text>
        </View>

        {/* Expanded day panel — glass card */}
        {expandedDay && (() => {
          const dayRituals = ritualCompletionsByDate[expandedDay] || []
          const daySeedIds = anchorLogsByDate[expandedDay]
          const dayMoments = momentsByDate[expandedDay] || []
          const hasAny = dayRituals.length > 0 || (daySeedIds?.size || 0) > 0 || dayMoments.length > 0

          return (
            <View style={{
              marginTop: 14, borderRadius: 16, padding: 16,
              backgroundColor: 'rgba(250,245,240,0.85)',
              borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
                {new Date(expandedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>

              {!hasAny ? (
                <Text style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                  A rest day. Those matter too.
                </Text>
              ) : (
                <>
                  {dayRituals.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Rituals
                      </Text>
                      {dayRituals.map(c => {
                        const cat = c.ritual?.category || 'morning'
                        const meta = CATEGORY_META[cat as RitualCategory] || CATEGORY_META.morning
                        return (
                          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <View style={{
                              width: 22, height: 22, borderRadius: 7,
                              backgroundColor: meta.lightBg,
                              alignItems: 'center', justifyContent: 'center', marginRight: 8,
                            }}>
                              {getRitualIcon(c.ritual?.icon || null, 12, meta.accent)}
                            </View>
                            <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>{c.ritual?.name || 'Ritual'}</Text>
                            {c.mood && RITUAL_MOOD_EMOJIS[c.mood] && (
                              <Text style={{ fontSize: 12 }}>{RITUAL_MOOD_EMOJIS[c.mood].emoji}</Text>
                            )}
                          </View>
                        )
                      })}
                    </View>
                  )}

                  {daySeedIds && daySeedIds.size > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Seeds
                      </Text>
                      {anchors.filter(a => daySeedIds.has(a.id)).map(anchor => {
                        const isGrow = anchor.type === 'grow'
                        return (
                          <View key={anchor.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <View style={{
                              width: 22, height: 22, borderRadius: 7,
                              backgroundColor: isGrow ? '#d1fae5' : '#fef3c7',
                              alignItems: 'center', justifyContent: 'center', marginRight: 8,
                            }}>
                              {getAnchorIcon(anchor.icon, 12, isGrow ? '#059669' : '#d97706')}
                            </View>
                            <Text style={{ fontSize: 13, color: '#374151' }}>{anchor.label_en}</Text>
                          </View>
                        )
                      })}
                    </View>
                  )}

                  {dayMoments.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#ec4899', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Moments
                      </Text>
                      <Text style={{ fontSize: 13, color: '#374151' }}>
                        {dayMoments.length} moment{dayMoments.length !== 1 ? 's' : ''} captured
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )
        })()}
      </Card>
    </AnimatedSection>
  )
}
