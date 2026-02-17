import { View, Text } from 'react-native'
import { MOOD_COLORS } from './shared'
import SectionHeader from './SectionHeader'
import type { WeekData } from './useAnalyticsData'
import type { Theme } from './shared'

type Props = {
  weeklyMoodData: WeekData[]
  isDark: boolean
  theme: Theme
}

export default function EmotionRiver({ weeklyMoodData, isDark, theme }: Props) {
  return (
    <>
      <SectionHeader
        title="How You've Been Feeling"
        subtitle="Your emotional flow, week by week"
        isDark={isDark}
      />
      <View style={{ gap: 16, marginBottom: 44 }}>
        {weeklyMoodData.map((week, i) => (
          <View key={i}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 6,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textFaint }}>
                {week.label}
              </Text>
              {week.total > 0 && (
                <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.25)' : '#c8c8c8' }}>
                  {week.total} feeling{week.total !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            {week.total === 0 ? (
              <View style={{
                height: 36, alignItems: 'center', justifyContent: 'center',
              }}>
                <View style={{
                  width: '100%', height: 2, borderRadius: 1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  position: 'absolute',
                }} />
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                }} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', height: 36, borderRadius: 18, overflow: 'hidden', gap: 2 }}>
                {Object.entries(week.moodCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mood, count], idx) => (
                    <View key={mood} style={{
                      flex: count / week.total, minWidth: 6,
                      backgroundColor: MOOD_COLORS[mood] || '#6b7280',
                      borderRadius: 18,
                      marginLeft: idx === 0 ? 0 : -2, // overlap slightly for bead effect
                    }} />
                  ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </>
  )
}
