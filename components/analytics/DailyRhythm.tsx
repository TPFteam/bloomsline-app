import { View, Text } from 'react-native'
import { Sun, Moon } from 'lucide-react-native'
import { MOOD_COLORS, SCREEN_WIDTH } from './shared'
import SectionHeader from './SectionHeader'
import type { TimeBucket } from './useAnalyticsData'
import type { Theme } from './shared'

type Props = {
  timeBuckets: TimeBucket[]
  peakBucketIndex: number
  isDark: boolean
  theme: Theme
}

const TIME_TINTS: Record<string, { light: string; dark: string }> = {
  Morning:   { light: 'rgba(251,191,36,0.06)', dark: 'rgba(251,191,36,0.08)' },
  Afternoon: { light: 'rgba(245,158,11,0.06)', dark: 'rgba(245,158,11,0.08)' },
  Evening:   { light: 'rgba(139,92,246,0.06)', dark: 'rgba(139,92,246,0.08)' },
  Night:     { light: 'rgba(99,102,241,0.06)', dark: 'rgba(99,102,241,0.08)' },
}

export default function DailyRhythm({ timeBuckets, peakBucketIndex, isDark, theme }: Props) {
  return (
    <>
      <SectionHeader
        title="When You Feel Most"
        subtitle="Your emotional rhythm through the day"
        isDark={isDark}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 44 }}>
        {timeBuckets.map((bucket, i) => {
          const isPeak = i === peakBucketIndex && bucket.moments.length > 0
          const topMoods = Object.entries(bucket.moodCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
          const topMoodsTotal = topMoods.reduce((sum, [, c]) => sum + c, 0)
          const TimeIcon = i <= 1 ? Sun : Moon
          const tint = TIME_TINTS[bucket.label] || TIME_TINTS.Morning

          return (
            <View key={i} style={{
              width: (SCREEN_WIDTH - 44 - 12) / 2,
              paddingVertical: 16, paddingHorizontal: 16, borderRadius: 18,
              backgroundColor: isPeak
                ? (isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.06)')
                : (isDark ? tint.dark : tint.light),
              borderWidth: isPeak ? 1 : 0,
              borderColor: isPeak ? 'rgba(245,158,11,0.25)' : 'transparent',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <TimeIcon
                  size={14}
                  color={isPeak ? '#f59e0b' : theme.textMuted}
                  style={isPeak ? {
                    shadowColor: '#f59e0b',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                  } as any : undefined}
                />
                <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#ffffff' : '#111827' }}>
                  {bucket.label}
                </Text>
              </View>

              {/* Hero count */}
              <Text style={{
                fontSize: 24, fontWeight: '800',
                color: isDark ? '#ffffff' : '#111827',
              }}>
                {bucket.moments.length}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textFaint, marginBottom: 10 }}>
                moments
              </Text>

              {/* Mini stacked bar */}
              {topMoodsTotal > 0 ? (
                <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
                  {topMoods.map(([mood, count]) => (
                    <View key={mood} style={{
                      flex: count / topMoodsTotal, minWidth: 4,
                      backgroundColor: MOOD_COLORS[mood] || '#6b7280',
                      borderRadius: 3,
                    }} />
                  ))}
                </View>
              ) : (
                <View style={{ height: 6 }} />
              )}

              {isPeak && (
                <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: '600', marginTop: 10 }}>
                  Peak expressive time
                </Text>
              )}
            </View>
          )
        })}
      </View>
    </>
  )
}
