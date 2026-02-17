import { View, Text } from 'react-native'
import { Flame } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import { Card, DAY_LABELS, getAnchorIcon, type AnchorRow } from './shared'

type Props = {
  index: number
  anchor: AnchorRow
  weekDays: string[]
  today: string
  dateCounts: Record<string, number>
  stats: { currentStreak: number; last30: number }
}

export default function AnchorCard({
  index,
  anchor,
  weekDays,
  today,
  dateCounts,
  stats,
}: Props) {
  const isGrow = anchor.type === 'grow'
  const accent = isGrow ? '#059669' : '#d97706'
  const lightBg = isGrow ? '#d1fae5' : '#fef3c7'
  const weekLogged = weekDays.filter(d => !!dateCounts[d]).length

  return (
    <AnimatedSection index={index}>
      <Card style={{ padding: 18 }}>
        {/* Header: icon badge + name + streak */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: lightBg,
            alignItems: 'center', justifyContent: 'center', marginRight: 10,
          }}>
            {getAnchorIcon(anchor.icon, 18, accent)}
          </View>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1 }}>
            {anchor.label_en}
          </Text>
          {stats.currentStreak >= 2 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: `${accent}15`,
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 4,
            }}>
              <Flame size={14} color={accent} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: accent }}>
                {stats.currentStreak}
              </Text>
            </View>
          )}
        </View>

        {/* 7-day bead bar */}
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {weekDays.map((dayStr, i) => {
            const logged = !!dateCounts[dayStr]
            const isToday = dayStr === today

            return (
              <View key={i} style={{
                flex: 1, height: 40, borderRadius: 12,
                backgroundColor: logged ? accent : lightBg,
                borderWidth: isToday && !logged ? 1.5 : 0,
                borderColor: accent,
                borderStyle: isToday && !logged ? 'dashed' : 'solid',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {!logged && (
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#c4c4c4' }}>-</Text>
                )}
              </View>
            )
          })}
        </View>

        {/* Day labels */}
        <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{
                fontSize: 10, fontWeight: weekDays[i] === today ? '700' : '400',
                color: weekDays[i] === today ? accent : '#b0b0b0',
              }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* "X of 30 days" stat */}
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
          {stats.last30} of 30 days
        </Text>

        {/* Friendly note */}
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
          {weekLogged === 7 ? `Every day this week \u2014 ${isGrow ? 'growing strong' : 'real discipline'}.`
            : weekLogged >= 5 ? `${weekLogged} out of 7 \u2014 ${isGrow ? 'steady growth' : 'strong willpower'}.`
            : weekLogged >= 3 ? `${weekLogged} days this week \u2014 you're building a habit.`
            : weekLogged > 0 ? `${weekLogged} day${weekLogged === 1 ? '' : 's'} this week \u2014 every step matters.`
            : `Not yet this week \u2014 ${isGrow ? 'plant a seed today' : 'today is a fresh start'}.`
          }
        </Text>
      </Card>
    </AnimatedSection>
  )
}
