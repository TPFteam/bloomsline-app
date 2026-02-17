import { View, Text, TouchableOpacity } from 'react-native'
import { Circle } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import { Card, SCREEN_WIDTH, ANCHOR_ICONS, getMonthColor, type Anchor } from './shared'

type Props = {
  index: number
  monthDays: string[]
  today: string
  dayBreakdown: Record<string, { grow: number; letgo: number }>
  expandedDay: string | null
  setExpandedDay: (day: string | null) => void
  seedsForDay: (dateStr: string) => { anchor: Anchor; count: number }[]
}

export default function MonthGrid({
  index,
  monthDays,
  today,
  dayBreakdown,
  expandedDay,
  setExpandedDay,
  seedsForDay,
}: Props) {
  const GAP = 6
  const availableWidth = SCREEN_WIDTH - 88
  const cellSize = Math.floor((availableWidth - GAP * 6) / 7)

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="Your month" subtitle="Last 30 days" isDark={false} accentColor="#14b8a6" />

        {/* 30-day grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {monthDays.map(dayStr => {
            const bd = dayBreakdown[dayStr] || { grow: 0, letgo: 0 }
            const total = bd.grow + bd.letgo
            const isToday = dayStr === today
            const bgColor = getMonthColor(bd.grow, bd.letgo)
            const dayNum = parseInt(dayStr.split('-')[2], 10)

            return (
              <TouchableOpacity
                key={dayStr}
                onPress={() => setExpandedDay(expandedDay === dayStr ? null : dayStr)}
                activeOpacity={0.7}
                style={{
                  width: cellSize, height: cellSize, borderRadius: 10,
                  backgroundColor: bgColor,
                  borderWidth: expandedDay === dayStr ? 2 : 0,
                  borderColor: '#9ca3af',
                  alignItems: 'center', justifyContent: 'center',
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

        {/* Legend */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 12 }}>
          {[
            { color: '#34d399', label: 'Grow' },
            { color: '#f59e0b', label: 'Let go' },
            { color: '#2dd4bf', label: 'Both' },
          ].map(item => (
            <View key={item.label} style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
              backgroundColor: `${item.color}15`,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
              <Text style={{ fontSize: 10, fontWeight: '500', color: item.color }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Expanded day panel — glass card */}
        {expandedDay && (() => {
          const daySeeds = seedsForDay(expandedDay)
          return (
            <View style={{
              marginTop: 14, borderRadius: 16, padding: 16,
              backgroundColor: 'rgba(250,245,240,0.85)',
              borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                {new Date(expandedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              {daySeeds.length > 0 ? (
                daySeeds.map(({ anchor, count }) => {
                  const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                  const isGrow = anchor.type === 'grow'
                  return (
                    <View key={anchor.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 10,
                        backgroundColor: isGrow ? '#ecfdf5' : '#fef3c7',
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                      }}>
                        <Icon size={14} color={isGrow ? '#059669' : '#d97706'} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{anchor.label_en}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isGrow ? '#059669' : '#d97706' }}>{'\u00d7'}{count}</Text>
                    </View>
                  )
                })
              ) : (
                <Text style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No seeds logged this day</Text>
              )}
            </View>
          )
        })()}
      </Card>
    </AnimatedSection>
  )
}
