import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Svg, { Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import type { Moment } from '@/lib/services/moments'
import { MOOD_COLORS, MOOD_HINTS } from './shared'
import SectionHeader from './SectionHeader'
import type { Theme } from './shared'

type Props = {
  sortedMoods: [string, number][]
  moodCounts: Record<string, number>
  uniqueMoodCount: number
  moments: Moment[]
  isDark: boolean
  theme: Theme
}

export default function EmotionalPalette({
  sortedMoods, moodCounts, uniqueMoodCount, moments, isDark, theme,
}: Props) {
  const [selectedMoodRing, setSelectedMoodRing] = useState<string | null>(null)

  const totalTags = sortedMoods.reduce((sum, [, c]) => sum + c, 0)
  const top5 = sortedMoods.slice(0, 5)

  // SVG arc ring data
  const svgSize = 280
  const center = svgSize / 2
  const strokeWidth = 16
  const ringGap = 6
  const baseRadius = 40

  const rings = top5.map(([mood, count], i) => {
    const radius = baseRadius + i * (strokeWidth + ringGap)
    const circumference = 2 * Math.PI * radius
    const pct = totalTags > 0 ? count / totalTags : 0
    const arcLength = circumference * pct
    const color = MOOD_COLORS[mood] || '#6b7280'
    const isSelected = selectedMoodRing === mood
    return { mood, count, radius, circumference, arcLength, color, pct, isSelected }
  })

  // Selected mood insight
  const selectedInsight = useMemo(() => {
    if (!selectedMoodRing) return null
    const color = MOOD_COLORS[selectedMoodRing] || '#6b7280'
    const count = moodCounts[selectedMoodRing] || 0
    const pct = totalTags > 0 ? Math.round((count / totalTags) * 100) : 0
    const hint = MOOD_HINTS[selectedMoodRing] || 'A feeling you honored'

    const hourCounts = [0, 0, 0, 0]
    const bucketLabels = ['morning', 'afternoon', 'evening', 'night']
    moments.forEach(m => {
      if (!m.moods?.includes(selectedMoodRing)) return
      const h = new Date(m.created_at).getHours()
      if (h >= 5 && h < 12) hourCounts[0]++
      else if (h >= 12 && h < 17) hourCounts[1]++
      else if (h >= 17 && h < 21) hourCounts[2]++
      else hourCounts[3]++
    })
    const peakIdx = hourCounts.indexOf(Math.max(...hourCounts))
    const peakTime = bucketLabels[peakIdx]

    const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    let thisWeek = 0, lastWeek = 0
    moments.forEach(m => {
      if (!m.moods?.includes(selectedMoodRing)) return
      const d = new Date(m.created_at)
      if (d >= weekAgo) thisWeek++
      else if (d >= twoWeeksAgo) lastWeek++
    })
    let trend = 'steady'
    if (thisWeek > lastWeek) trend = 'rising'
    else if (thisWeek < lastWeek) trend = 'easing'

    const latest = moments.find(m => m.moods?.includes(selectedMoodRing))
    const snippet = latest?.text_content || latest?.caption || null

    return { color, count, pct, hint, peakTime, trend, thisWeek, lastWeek, snippet }
  }, [selectedMoodRing, moodCounts, totalTags, moments])

  const topColor1 = MOOD_COLORS[sortedMoods[0]?.[0]] || '#10b981'
  const topColor2 = MOOD_COLORS[sortedMoods[1]?.[0]] || '#14b8a6'

  return (
    <>
      <SectionHeader
        title="Your Emotional Palette"
        subtitle="Tap a ring to explore"
        isDark={isDark}
        accentColor={topColor1}
      />

      {/* SVG Arc Rings */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Svg width={svgSize} height={svgSize}>
          <Defs>
            <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={topColor1} stopOpacity={0.25} />
              <Stop offset="60%" stopColor={topColor2} stopOpacity={0.08} />
              <Stop offset="100%" stopColor="transparent" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Center glow */}
          <Circle cx={center} cy={center} r={baseRadius - 6} fill="url(#centerGlow)" />

          {/* Background tracks + arc rings */}
          {rings.map((ring) => (
            <G key={ring.mood}>
              {/* Faint track */}
              <Circle
                cx={center} cy={center} r={ring.radius}
                stroke={`${ring.color}15`}
                strokeWidth={ring.isSelected ? strokeWidth + 4 : strokeWidth}
                fill="none"
              />
              {/* Active arc */}
              <Circle
                cx={center} cy={center} r={ring.radius}
                stroke={ring.isSelected ? ring.color : `${ring.color}BB`}
                strokeWidth={ring.isSelected ? strokeWidth + 4 : strokeWidth}
                fill="none"
                strokeDasharray={`${ring.arcLength} ${ring.circumference - ring.arcLength}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                rotation={-90}
                origin={`${center}, ${center}`}
              />
            </G>
          ))}
        </Svg>

        {/* Center text overlay */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMoodRing(null)}
          >
            {selectedMoodRing ? (
              <Text style={{
                fontSize: 15, fontWeight: '700', textTransform: 'capitalize',
                color: MOOD_COLORS[selectedMoodRing] || theme.textFaint,
              }}>
                {selectedMoodRing}
              </Text>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#ffffff' : '#111827' }}>
                  {totalTags}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textFaint, marginTop: 1 }}>
                  feelings
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Insight card for selected mood */}
      {selectedInsight && selectedMoodRing && (
        <LinearGradient
          colors={[`${selectedInsight.color}18`, `${selectedInsight.color}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24, padding: 24, marginBottom: 20,
            shadowColor: selectedInsight.color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <View style={{
              width: 14, height: 14, borderRadius: 7,
              backgroundColor: selectedInsight.color,
              shadowColor: selectedInsight.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5, shadowRadius: 6,
            }} />
            <Text style={{
              fontSize: 18, fontWeight: '700', textTransform: 'capitalize',
              color: isDark ? '#ffffff' : '#111827',
            }}>
              {selectedMoodRing}
            </Text>
          </View>
          <Text style={{
            fontSize: 14, color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
            marginBottom: 16, lineHeight: 20,
          }}>
            {selectedInsight.hint}
          </Text>
          <Text style={{
            fontSize: 14, lineHeight: 22, fontWeight: '500',
            color: isDark ? 'rgba(255,255,255,0.75)' : '#374151',
            marginBottom: 16,
          }}>
            You've felt {selectedMoodRing} {selectedInsight.count} time{selectedInsight.count !== 1 ? 's' : ''} — that's {selectedInsight.pct}% of your moments.{' '}
            It visits you most in the {selectedInsight.peakTime},{' '}
            {selectedInsight.trend === 'rising' ? 'and it\'s been growing this week.' : selectedInsight.trend === 'easing' ? 'and it\'s been quieter this week.' : 'holding steady lately.'}
          </Text>
          {selectedInsight.snippet && (
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
              borderRadius: 14, padding: 14,
            }}>
              <Text style={{
                fontSize: 22, lineHeight: 22, color: `${selectedInsight.color}60`,
                fontWeight: '700', marginBottom: 2,
              }}>
                "
              </Text>
              <Text style={{
                fontSize: 14, color: isDark ? 'rgba(255,255,255,0.7)' : '#4b5563',
                lineHeight: 20, fontStyle: 'italic',
              }} numberOfLines={3}>
                {selectedInsight.snippet}
              </Text>
            </View>
          )}
        </LinearGradient>
      )}

      {/* Legend — unified pill chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {sortedMoods.map(([mood, count]) => {
          const color = MOOD_COLORS[mood] || '#6b7280'
          const pct = totalTags > 0 ? Math.round((count / totalTags) * 100) : 0
          const isSelected = selectedMoodRing === mood
          return (
            <TouchableOpacity
              key={mood}
              activeOpacity={0.7}
              onPress={() => setSelectedMoodRing(prev => prev === mood ? null : mood)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                backgroundColor: isSelected ? `${color}30` : `${color}14`,
              }}
            >
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: isSelected ? color : `${color}90`,
              }} />
              <Text style={{
                fontSize: 13, fontWeight: isSelected ? '700' : '500', textTransform: 'capitalize',
                color: isSelected ? color : (isDark ? 'rgba(255,255,255,0.8)' : '#374151'),
              }}>
                {mood}
              </Text>
              <Text style={{
                fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#b0b0b0',
              }}>
                {pct}%
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={{ fontSize: 13, color: theme.textFaint, textAlign: 'center', marginTop: 14, marginBottom: 44 }}>
        {uniqueMoodCount} emotion{uniqueMoodCount !== 1 ? 's' : ''} across {moments.length} moments
      </Text>
    </>
  )
}
