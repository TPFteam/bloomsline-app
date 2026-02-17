import { View, Text } from 'react-native'
import { Heart } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import { Card, RITUAL_MOOD_EMOJIS, MOMENT_MOOD_COLORS } from './shared'

type Props = {
  index: number
  ritualMoodCounts: Record<string, number>
  totalRitualMoods: number
  topMomentMoods: [string, number][]
  moodNarrative: string
}

export default function MoodSection({
  index,
  ritualMoodCounts,
  totalRitualMoods,
  topMomentMoods,
  moodNarrative,
}: Props) {
  const hasData = totalRitualMoods > 0 || topMomentMoods.length > 0

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="How you've been feeling" subtitle="Your emotional landscape" isDark={false} accentColor="#ec4899" />

        {hasData ? (
          <>
            {/* Ritual mood circles */}
            {totalRitualMoods > 0 && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
                  {['great', 'good', 'okay', 'low', 'difficult'].map(mood => {
                    const count = ritualMoodCounts[mood] || 0
                    const meta = RITUAL_MOOD_EMOJIS[mood]
                    const ratio = totalRitualMoods > 0 ? count / totalRitualMoods : 0
                    const size = Math.round(28 + ratio * 28)
                    return (
                      <View key={mood} style={{ alignItems: 'center' }}>
                        <View style={{
                          width: size, height: size, borderRadius: size / 2,
                          backgroundColor: count > 0 ? meta.bg : '#f5f5f4',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: Math.round(size * 0.45) }}>{meta.emoji}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: count > 0 ? meta.color : '#d1d5db', marginTop: 4 }}>
                          {meta.label}
                        </Text>
                      </View>
                    )
                  })}
                </View>

                {/* Proportional stacked mood bar */}
                <View style={{
                  flexDirection: 'row', height: 8, borderRadius: 4,
                  overflow: 'hidden', marginBottom: 16,
                }}>
                  {['great', 'good', 'okay', 'low', 'difficult'].map(mood => {
                    const count = ritualMoodCounts[mood] || 0
                    if (count === 0) return null
                    const pct = (count / totalRitualMoods) * 100
                    return (
                      <View key={mood} style={{
                        flex: pct,
                        backgroundColor: RITUAL_MOOD_EMOJIS[mood].color,
                      }} />
                    )
                  })}
                </View>
              </>
            )}

            {/* Moment mood pills */}
            {topMomentMoods.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {topMomentMoods.map(([mood, count]) => {
                  const color = MOMENT_MOOD_COLORS[mood] || '#6b7280'
                  return (
                    <View key={mood} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                      backgroundColor: `${color}15`,
                    }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color, textTransform: 'capitalize' }}>
                        {mood}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#9ca3af' }}>{count}</Text>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Mood narrative */}
            {moodNarrative ? (
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#4b5563', lineHeight: 22, textAlign: 'center' }}>
                {moodNarrative}
              </Text>
            ) : null}
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10,
            }}>
              <Heart size={22} color="#ec4899" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
              Your feelings matter here
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18, maxWidth: 260 }}>
              When you complete rituals or capture moments, your moods will appear here as a gentle mirror of your inner world.
            </Text>
          </View>
        )}
      </Card>
    </AnimatedSection>
  )
}
