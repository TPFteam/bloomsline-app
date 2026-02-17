import { View, Text } from 'react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import {
  Card,
  DAY_LABELS,
  type CompletionRow,
  type MomentRow,
} from './shared'

type Props = {
  index: number
  weekDays: string[]
  today: string
  ritualCompletionsByDate: Record<string, CompletionRow[]>
  anchorLogsByDate: Record<string, Set<string>>
  momentsByDate: Record<string, MomentRow[]>
  weekNarrative: string
}

export default function WeekStrip({
  index,
  weekDays,
  today,
  ritualCompletionsByDate,
  anchorLogsByDate,
  momentsByDate,
  weekNarrative,
}: Props) {
  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="This week" subtitle="Your daily rhythm" isDark={false} accentColor="#059669" />

        <Text style={{ fontSize: 15, fontWeight: '600', color: '#4b5563', lineHeight: 22, marginBottom: 20 }}>
          {weekNarrative}
        </Text>

        {/* 7-day strip with vertical pill columns */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {weekDays.map((dayStr, i) => {
            const hasRitual = (ritualCompletionsByDate[dayStr] || []).length > 0
            const hasSeed = !!anchorLogsByDate[dayStr]?.size
            const hasMoment = (momentsByDate[dayStr] || []).length > 0
            const isToday = dayStr === today

            return (
              <View key={dayStr} style={{
                flex: 1, alignItems: 'center',
                backgroundColor: isToday ? 'rgba(5,150,105,0.06)' : 'transparent',
                borderRadius: 14, paddingVertical: 10,
                borderWidth: isToday ? 1 : 0,
                borderColor: 'rgba(5,150,105,0.25)',
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: isToday ? '700' : '500',
                  color: isToday ? '#059669' : '#9ca3af',
                  marginBottom: 8,
                }}>
                  {DAY_LABELS[i]}
                </Text>
                {/* Vertical pill column: 3 mini-bars */}
                {[
                  { active: hasRitual, color: '#22c55e' },
                  { active: hasSeed, color: '#f59e0b' },
                  { active: hasMoment, color: '#ec4899' },
                ].map((bar, bi) => (
                  <View key={bi} style={{
                    width: 18, height: 10, borderRadius: 5, marginBottom: bi < 2 ? 2 : 0,
                    backgroundColor: bar.active ? bar.color : '#e5e7eb',
                  }} />
                ))}
              </View>
            )
          })}
        </View>

        {/* Legend: rounded pill chips */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14 }}>
          {[
            { color: '#22c55e', label: 'Rituals' },
            { color: '#f59e0b', label: 'Seeds' },
            { color: '#ec4899', label: 'Moments' },
          ].map(item => (
            <View key={item.label} style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
              backgroundColor: `${item.color}12`,
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
              <Text style={{ fontSize: 10, fontWeight: '500', color: item.color }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card>
    </AnimatedSection>
  )
}
