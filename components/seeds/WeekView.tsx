import { View, Text } from 'react-native'
import { Circle } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import { Card, SCREEN_WIDTH, ANCHOR_ICONS, DAY_LABELS, type Anchor } from './shared'

type Props = {
  index: number
  growAnchors: Anchor[]
  letgoAnchors: Anchor[]
  weekDays: string[]
  today: string
  historyMap: Record<string, Record<string, number>>
  anchorStats: Record<string, { weekTotal: number }>
  totalAnchors: number
}

export default function WeekView({
  index,
  growAnchors,
  letgoAnchors,
  weekDays,
  today,
  historyMap,
  anchorStats,
  totalAnchors,
}: Props) {
  function renderGroup(anchors: Anchor[], type: 'grow' | 'letgo') {
    if (anchors.length === 0) return null
    const accent = type === 'grow' ? '#059669' : '#d97706'
    const fillColor = type === 'grow' ? '#059669' : '#d97706'
    const emptyColor = type === 'grow' ? '#d1fae5' : '#fef3c7'

    return (
      <View style={{ marginBottom: type === 'grow' && letgoAnchors.length > 0 ? 12 : 0 }}>
        <Text style={{ fontSize: 10, fontWeight: '600', color: accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          {type === 'grow' ? 'Grow' : 'Let Go'}
        </Text>
        {anchors.map(anchor => {
          const Icon = ANCHOR_ICONS[anchor.icon] || Circle
          const dateCounts = historyMap[anchor.id] || {}
          const weekTotal = anchorStats[anchor.id]?.weekTotal || 0
          return (
            <View key={anchor.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: SCREEN_WIDTH * 0.28 }}>
                <Icon size={14} color={accent} style={{ marginRight: 6 }} />
                <Text numberOfLines={1} style={{ fontSize: 12, color: '#374151', flex: 1 }}>{anchor.label_en}</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
                {weekDays.map((dayStr, i) => {
                  const logged = (dateCounts[dayStr] || 0) > 0
                  const isToday = dayStr === today
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }}>
                      <View style={{
                        width: 16, height: 16, borderRadius: 8,
                        backgroundColor: logged ? fillColor : emptyColor,
                        ...(isToday && !logged ? { borderWidth: 1.5, borderColor: accent } : {}),
                      }} />
                    </View>
                  )
                })}
              </View>
              <Text style={{ width: 24, textAlign: 'right', fontSize: 12, fontWeight: '600', color: accent }}>{weekTotal}</Text>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="This week" subtitle="Daily check-ins" isDark={false} accentColor="#059669" />

        {/* Day labels row */}
        <View style={{ flexDirection: 'row', marginBottom: 10, paddingLeft: SCREEN_WIDTH * 0.28 }}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{
                fontSize: 11,
                fontWeight: weekDays[i] === today ? '700' : '500',
                color: weekDays[i] === today ? '#059669' : '#9ca3af',
              }}>
                {label}
              </Text>
            </View>
          ))}
          <View style={{ width: 24 }} />
        </View>

        {renderGroup(growAnchors, 'grow')}
        {renderGroup(letgoAnchors, 'letgo')}

        {totalAnchors === 0 && (
          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 }}>
            No seeds yet. Add some from the home screen!
          </Text>
        )}
      </Card>
    </AnimatedSection>
  )
}
