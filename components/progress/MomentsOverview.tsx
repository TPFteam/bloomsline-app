import { View, Text } from 'react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import { Card, MOMENT_TYPE_META, MOMENT_MOOD_COLORS } from './shared'

type Props = {
  index: number
  totalMoments: number
  momentTypeCounts: Record<string, number>
  topMomentMoods: [string, number][]
  momentsNarrative: string
}

export default function MomentsOverview({
  index,
  totalMoments,
  momentTypeCounts,
  topMomentMoods,
  momentsNarrative,
}: Props) {
  const totalMoodCount = topMomentMoods.reduce((sum, [, c]) => sum + c, 0)

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="Your moments" subtitle="What you've captured" isDark={false} accentColor="#ec4899" />

        {totalMoments > 0 ? (
          <>
            {/* Hero count + type breakdown chips */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ marginRight: 16 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#ec4899' }}>{totalMoments}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: -2 }}>moments</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['photo', 'video', 'voice', 'write'] as const).map(type => {
                  const count = momentTypeCounts[type] || 0
                  if (count === 0) return null
                  const meta = MOMENT_TYPE_META[type]
                  const TypeIcon = meta.icon
                  return (
                    <View key={type} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
                      backgroundColor: '#f9fafb',
                    }}>
                      <TypeIcon size={14} color="#6b7280" />
                      <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{count}</Text>
                    </View>
                  )
                })}
              </View>
            </View>

            {/* Top mood mini stacked bar + pill labels */}
            {topMomentMoods.length > 0 && totalMoodCount > 0 && (
              <View style={{ marginBottom: 14 }}>
                <View style={{
                  flexDirection: 'row', height: 10, borderRadius: 5,
                  overflow: 'hidden', marginBottom: 8,
                }}>
                  {topMomentMoods.slice(0, 4).map(([mood, count]) => {
                    const color = MOMENT_MOOD_COLORS[mood] || '#6b7280'
                    const pct = (count / totalMoodCount) * 100
                    return (
                      <View key={mood} style={{ flex: pct, backgroundColor: color }} />
                    )
                  })}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {topMomentMoods.slice(0, 4).map(([mood]) => {
                    const color = MOMENT_MOOD_COLORS[mood] || '#6b7280'
                    return (
                      <View key={mood} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                        backgroundColor: `${color}12`,
                      }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                        <Text style={{ fontSize: 11, fontWeight: '500', color, textTransform: 'capitalize' }}>
                          {mood}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Narrative */}
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>
              {momentsNarrative}
            </Text>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDCF8'}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
              No moments yet this month
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18, maxWidth: 260 }}>
              When something moves you, capture it. Photos, voice notes, writing — it all counts.
            </Text>
          </View>
        )}
      </Card>
    </AnimatedSection>
  )
}
