import { View, Text, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Flame, Trophy } from 'lucide-react-native'
import { MOOD_COLORS } from './shared'
import SectionHeader from './SectionHeader'
import type { StreakData, TopDay } from './useAnalyticsData'
import type { Theme } from './shared'

type Props = {
  streakData: StreakData
  topDays: TopDay[]
  isDark: boolean
  theme: Theme
}

export default function BrightestDays({ streakData, topDays, isDark, theme }: Props) {
  return (
    <>
      <SectionHeader
        title="Your Brightest Days"
        subtitle="The days you shined"
        isDark={isDark}
        accentColor="#FFB347"
      />

      {/* Streak stats — two glass cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        {/* Current streak */}
        <LinearGradient
          colors={isDark ? ['rgba(251,191,36,0.12)', 'rgba(251,191,36,0.04)'] : ['rgba(255,179,71,0.12)', 'rgba(255,179,71,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1, borderRadius: 20, padding: 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(255,179,71,0.15)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Flame size={16} color="#FFB347" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textFaint }}>
              Current
            </Text>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '800', color: isDark ? '#ffffff' : '#111827' }}>
            {streakData.current}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textFaint, marginTop: 2 }}>
            day{streakData.current !== 1 ? 's' : ''} in a row
          </Text>
        </LinearGradient>

        {/* Longest streak */}
        <LinearGradient
          colors={isDark ? ['rgba(168,85,247,0.12)', 'rgba(168,85,247,0.04)'] : ['rgba(168,85,247,0.08)', 'rgba(168,85,247,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1, borderRadius: 20, padding: 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Trophy size={16} color="#A855F7" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textFaint }}>
              Best
            </Text>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '800', color: isDark ? '#ffffff' : '#111827' }}>
            {streakData.longest}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textFaint, marginTop: 2 }}>
            day{streakData.longest !== 1 ? 's' : ''} record
          </Text>
        </LinearGradient>
      </View>

      {/* Day cards */}
      {topDays.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          style={{ marginBottom: 44 }}
        >
          {topDays.map((day, i) => {
            const moodColor = day.dominant ? (MOOD_COLORS[day.dominant] || '#6b7280') : theme.textFaint
            const dateObj = new Date(day.date + 'T12:00:00')
            return (
              <View key={day.date} style={{
                width: 190, borderRadius: 20, padding: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              }}>
                {/* Rank + mood indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: `${moodColor}18`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: moodColor }}>
                      {i + 1}
                    </Text>
                  </View>
                  {day.dominant && (
                    <Text style={{
                      fontSize: 11, fontWeight: '600', textTransform: 'capitalize',
                      color: moodColor,
                    }}>
                      {day.dominant}
                    </Text>
                  )}
                </View>

                <Text style={{
                  fontSize: 15, fontWeight: '700',
                  color: isDark ? '#ffffff' : '#111827',
                }}>
                  {dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textFaint, marginTop: 4 }}>
                  {day.count} moment{day.count !== 1 ? 's' : ''}
                </Text>
                {day.snippet ? (
                  <Text
                    style={{
                      fontSize: 12, color: theme.textMuted, marginTop: 10,
                      lineHeight: 17, fontStyle: 'italic',
                    }}
                    numberOfLines={2}
                  >
                    "{day.snippet}"
                  </Text>
                ) : null}
              </View>
            )
          })}
        </ScrollView>
      )}
    </>
  )
}
