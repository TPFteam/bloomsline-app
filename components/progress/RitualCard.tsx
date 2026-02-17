import { View, Text } from 'react-native'
import { Flame } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import {
  Card,
  CATEGORY_META,
  DAY_LABELS,
  getRitualIcon,
  type MemberRitualRow,
} from './shared'
import { type RitualCategory } from '@/lib/services/rituals'

type Props = {
  index: number
  ritual: MemberRitualRow
  weekDays: string[]
  today: string
  dayDetail: Record<string, { duration: number | null }>
  stats: { currentStreak: number; daysCompleted: number }
}

export default function RitualCard({
  index,
  ritual,
  weekDays,
  today,
  dayDetail,
  stats,
}: Props) {
  const cat = ritual.ritual?.category || 'morning'
  const meta = CATEGORY_META[cat as RitualCategory] || CATEGORY_META.morning
  const weekCompleted = weekDays.filter(d => !!dayDetail[d]).length

  return (
    <AnimatedSection index={index}>
      <Card style={{ padding: 18 }}>
        {/* Header: icon badge + name + streak */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: meta.lightBg,
            alignItems: 'center', justifyContent: 'center', marginRight: 10,
          }}>
            {getRitualIcon(ritual.ritual.icon, 18, meta.accent)}
          </View>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1 }}>
            {ritual.ritual.name}
          </Text>
          {stats.currentStreak >= 2 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: `${meta.accent}15`,
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 4,
            }}>
              <Flame size={14} color={meta.accent} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: meta.accent }}>
                {stats.currentStreak}
              </Text>
            </View>
          )}
        </View>

        {/* 7-day bead bar */}
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {weekDays.map((dayStr, i) => {
            const detail = dayDetail[dayStr]
            const done = !!detail
            const isToday = dayStr === today
            const dur = detail?.duration

            return (
              <View key={i} style={{
                flex: 1, height: 40, borderRadius: 12,
                backgroundColor: done ? meta.accent : meta.lightBg,
                borderWidth: isToday && !done ? 1.5 : 0,
                borderColor: meta.accent,
                borderStyle: isToday && !done ? 'dashed' : 'solid',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {done && dur != null ? (
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                    {Math.round(dur)}
                  </Text>
                ) : !done ? (
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#c4c4c4' }}>-</Text>
                ) : null}
              </View>
            )
          })}
        </View>

        {/* Day labels under bars */}
        <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{
                fontSize: 10, fontWeight: weekDays[i] === today ? '700' : '400',
                color: weekDays[i] === today ? meta.accent : '#b0b0b0',
              }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* "X of 30 days" stat */}
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          {stats.daysCompleted} of 30 days
        </Text>

        {/* Friendly note */}
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
          {weekCompleted === 7 ? 'Every day this week \u2014 incredible.'
            : weekCompleted >= 5 ? `${weekCompleted} out of 7 this week \u2014 strong rhythm.`
            : weekCompleted >= 3 ? `${weekCompleted} days this week \u2014 you're showing up.`
            : weekCompleted > 0 ? `${weekCompleted} day${weekCompleted === 1 ? '' : 's'} this week \u2014 every one counts.`
            : 'Not yet this week \u2014 today is always a good day to start.'
          }
        </Text>
      </Card>
    </AnimatedSection>
  )
}
