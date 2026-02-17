import { View, Text, ScrollView, Modal, Pressable, TouchableOpacity, Dimensions } from 'react-native'
import { Sparkles, X } from 'lucide-react-native'
import type { Moment } from '@/lib/services/moments'
import { useAnalyticsData } from './useAnalyticsData'
import AnimatedSection from './AnimatedSection'
import SummaryHero from './SummaryHero'
import EmotionalPalette from './EmotionalPalette'
import EmotionRiver from './EmotionRiver'
import BrightestDays from './BrightestDays'
import DailyRhythm from './DailyRhythm'
import MoodExpressions from './MoodExpressions'
import type { Theme } from './shared'

type Props = {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  moments: Moment[]
  theme: Theme
  onTalkToBloom?: (message: string) => void
}

export default function EmotionAnalyticsModal({
  isOpen, onClose, isDark, moments, theme, onTalkToBloom,
}: Props) {
  const { height: screenHeight } = Dimensions.get('window')
  const data = useAnalyticsData(moments)

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.55)' }}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => {}} style={{
          height: screenHeight * 0.85,
          backgroundColor: isDark ? '#1a1a1c' : '#ffffff',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          overflow: 'hidden',
          shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.25, shadowRadius: 20, elevation: 20,
        }}>
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
            }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Sparkles size={20} color={isDark ? '#f59e0b' : '#d97706'} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#ffffff' : '#111827' }}>
                Your Emotional Story
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 34, height: 34, borderRadius: 17,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              }}
            >
              <X size={18} color={isDark ? 'rgba(255,255,255,0.6)' : '#9ca3af'} />
            </TouchableOpacity>
          </View>

          {moments.length < 3 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <Sparkles size={40} color={isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db'} />
              <Text style={{
                fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 16, lineHeight: 22,
                color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280',
              }}>
                Keep capturing moments — your story is still taking shape.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 32, paddingBottom: 80 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Section 1: Summary Hero */}
              <AnimatedSection index={0}>
                <SummaryHero
                  summary={data.summary}
                  shareQuote={data.shareQuote}
                  summaryGradient={data.summaryGradient}
                  isDark={isDark}
                  theme={theme}
                  onClose={onClose}
                  onTalkToBloom={onTalkToBloom}
                />
              </AnimatedSection>

              {/* Section 2: Emotional Palette */}
              <AnimatedSection index={1}>
                <EmotionalPalette
                  sortedMoods={data.sortedMoods}
                  moodCounts={data.moodCounts}
                  uniqueMoodCount={data.uniqueMoodCount}
                  moments={moments}
                  isDark={isDark}
                  theme={theme}
                />
              </AnimatedSection>

              {/* Section 3: Emotion River */}
              <AnimatedSection index={2}>
                <EmotionRiver
                  weeklyMoodData={data.weeklyMoodData}
                  isDark={isDark}
                  theme={theme}
                />
              </AnimatedSection>

              {/* Section 4: Brightest Days */}
              <AnimatedSection index={3}>
                <BrightestDays
                  streakData={data.streakData}
                  topDays={data.topDays}
                  isDark={isDark}
                  theme={theme}
                />
              </AnimatedSection>

              {/* Section 5: Daily Rhythm */}
              <AnimatedSection index={4}>
                <DailyRhythm
                  timeBuckets={data.timeBuckets}
                  peakBucketIndex={data.peakBucketIndex}
                  isDark={isDark}
                  theme={theme}
                />
              </AnimatedSection>

              {/* Section 6: Mood Expressions */}
              <AnimatedSection index={5}>
                <MoodExpressions
                  typeData={data.typeData}
                  isDark={isDark}
                  theme={theme}
                />
              </AnimatedSection>

              {/* Closing */}
              <Text style={{
                fontSize: 13, color: theme.textFaint, textAlign: 'center',
                marginTop: 10, marginBottom: 8,
              }}>
                Every feeling you name makes you stronger.
              </Text>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
