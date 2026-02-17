import { View, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Camera, Video, Mic, PenLine, Sparkles } from 'lucide-react-native'
import { MOOD_COLORS } from './shared'
import SectionHeader from './SectionHeader'
import type { TypeDataItem } from './useAnalyticsData'
import type { Theme } from './shared'

type Props = {
  typeData: TypeDataItem[]
  isDark: boolean
  theme: Theme
}

function TypeIcon({ type, size = 18, color = '#fff' }: { type: string; size?: number; color?: string }) {
  switch (type) {
    case 'photo': return <Camera size={size} color={color} />
    case 'video': return <Video size={size} color={color} />
    case 'voice': return <Mic size={size} color={color} />
    case 'write': return <PenLine size={size} color={color} />
    default: return <Sparkles size={size} color={color} />
  }
}

function typeGradient(type: string): [string, string] {
  switch (type) {
    case 'photo': return ['#fb7185', '#ec4899']
    case 'video': return ['#a78bfa', '#8b5cf6']
    case 'voice': return ['#fbbf24', '#f97316']
    case 'write': return ['#34d399', '#14b8a6']
    default: return ['#a3a3a3', '#737373']
  }
}

const TYPE_VERBS: Record<string, string> = {
  photo: 'capture photos', video: 'record videos', voice: 'leave voice notes', write: 'write',
}

export default function MoodExpressions({ typeData, isDark, theme }: Props) {
  return (
    <>
      <SectionHeader
        title="Mood & Moments"
        subtitle="How you choose to express each feeling"
        isDark={isDark}
      />
      <View style={{ gap: 14, marginBottom: 44 }}>
        {typeData.map(({ type, count, moodCounts: mc, total, topMood }) => {
          const sorted = Object.entries(mc).sort((a, b) => b[1] - a[1])
          const topMoodColor = topMood ? (MOOD_COLORS[topMood] || '#6b7280') : undefined

          return (
            <View key={type} style={{
              backgroundColor: theme.toggleBg, borderRadius: 20, padding: 18,
            }}>
              {/* Icon + label row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <LinearGradient
                  colors={typeGradient(type)}
                  style={{
                    width: 44, height: 44, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <TypeIcon type={type} size={20} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 15, fontWeight: '700', textTransform: 'capitalize',
                    color: isDark ? '#ffffff' : '#111827',
                  }}>
                    {type}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textFaint, marginTop: 2 }}>
                    {count} moment{count !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Taller mood bar */}
              {total > 0 && (
                <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
                  {sorted.map(([mood, c]) => (
                    <View key={mood} style={{
                      flex: c / total, minWidth: 4,
                      backgroundColor: MOOD_COLORS[mood] || '#6b7280',
                      borderRadius: 7,
                    }} />
                  ))}
                </View>
              )}

              {/* Insight with mood word highlighted */}
              {topMood && (
                <Text style={{ fontSize: 13, color: theme.textFaint, lineHeight: 18 }}>
                  You tend to {TYPE_VERBS[type] || type} when you feel{' '}
                  <Text style={{ color: topMoodColor, fontWeight: '700' }}>
                    {topMood}
                  </Text>
                  .
                </Text>
              )}
            </View>
          )
        })}
      </View>
    </>
  )
}
