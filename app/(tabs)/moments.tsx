import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Dimensions,
  Alert,
  Animated as RNAnimated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import {
  Plus,
  Camera,
  Video,
  Mic,
  PenLine,
  Sparkles,
  X,
  Trash2,
  Play,
  Sun,
  Moon,
  Send,
  Calendar,
  LayoutGrid,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Shuffle,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { getMemberMoments, deleteMoment, type Moment } from '@/lib/services/moments'
import { useBloomChat, type BloomMessage } from '@/lib/hooks/useBloomChat'
import { getUserPreferences, updateUserPreferences } from '@/lib/services/preferences'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ============================================
// Constants
// ============================================

const POSITIVE_MOODS = ['grateful', 'peaceful', 'joyful', 'inspired', 'loved', 'calm', 'hopeful', 'proud']

const MOOD_COLORS: Record<string, string> = {
  grateful: '#f59e0b',
  peaceful: '#14b8a6',
  joyful: '#eab308',
  inspired: '#8b5cf6',
  loved: '#ec4899',
  calm: '#06b6d4',
  hopeful: '#22c55e',
  proud: '#ef4444',
  overwhelmed: '#f97316',
  tired: '#6b7280',
  uncertain: '#a78bfa',
}

const BLOOM_PROMPTS = [
  'How are you feeling?',
  'What\'s on your mind?',
  'Tell me about your day',
  'Need someone to talk to?',
  'What made you smile today?',
  'Share your thoughts...',
]

const DEFAULT_SUGGESTIONS = [
  "How am I feeling today",
  "What have you noticed about me",
  "Help me with my habits",
  "How are my anchors going",
]

const TAGLINES = [
  "Listening to you",
  "Here for you",
  "Always by your side",
  "You matter",
  "Take your time",
  "I'm here",
]

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// ============================================
// Utility functions
// ============================================

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

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Yesterday'
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function getDominantMood(moments: Moment[]): string | null {
  const counts: Record<string, number> = {}
  moments.forEach(m => {
    m.moods?.forEach(mood => { counts[mood] = (counts[mood] || 0) + 1 })
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || null
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekLabel(date: Date, now: Date): string {
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay())
  startOfThisWeek.setHours(0, 0, 0, 0)

  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  if (date >= startOfThisWeek) return 'This Week'
  if (date >= startOfLastWeek) return 'Last Week'

  // Find the Monday of that week
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - date.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return `${weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
}

// Stable waveform heights seeded by index
function getWaveformHeight(index: number): number {
  const heights = [12, 20, 16, 24, 10, 22, 14, 26, 18, 8]
  return heights[index % heights.length]
}

// ============================================
// BloomPill
// ============================================

function BloomPill({ isDark, onPress }: { isDark: boolean; onPress?: () => void }) {
  const [promptIndex, setPromptIndex] = useState(0)
  const fadeAnim = useRef(new RNAnimated.Value(1)).current
  const pulseAnim = useRef(new RNAnimated.Value(1)).current

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      RNAnimated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setPromptIndex(prev => (prev + 1) % BLOOM_PROMPTS.length)
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
      })
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <View style={{
      position: 'absolute', bottom: 40, left: 0, right: 0,
      alignItems: 'center', zIndex: 50,
    }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingLeft: 16, paddingRight: 24, paddingVertical: 14,
          borderRadius: 999,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)',
          shadowColor: isDark ? '#10b981' : '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <RNAnimated.View style={{
            position: 'absolute', width: 20, height: 20, borderRadius: 10,
            backgroundColor: 'rgba(16,185,129,0.3)',
            transform: [{ scale: pulseAnim }],
          }} />
          <View style={{
            width: 12, height: 12, borderRadius: 6,
            backgroundColor: '#10b981',
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
          }} />
        </View>
        <RNAnimated.Text style={{
          fontSize: 14, fontWeight: '500',
          color: isDark ? 'rgba(255,255,255,0.75)' : '#374151',
          opacity: fadeAnim,
          width: 180,
        }}>
          {BLOOM_PROMPTS[promptIndex]}
        </RNAnimated.Text>
      </TouchableOpacity>
    </View>
  )
}

// ============================================
// Bloom Chat Modal
// ============================================

function TypingDots({ isDark }: { isDark: boolean }) {
  const anims = useRef([
    new RNAnimated.Value(0.3),
    new RNAnimated.Value(0.3),
    new RNAnimated.Value(0.3),
  ]).current

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(anim, { toValue: 1, duration: 400, delay: i * 200, useNativeDriver: true }),
          RNAnimated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    )
    animations.forEach(a => a.start())
    return () => animations.forEach(a => a.stop())
  }, [])

  return (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      <View style={{
        borderRadius: 16, borderBottomLeftRadius: 4,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
      }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {anims.map((anim, i) => (
            <RNAnimated.View
              key={i}
              style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: isDark ? 'rgba(255,255,255,0.5)' : '#9ca3af',
                opacity: anim,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

function ChatBubble({ message, isDark }: { message: BloomMessage; isDark: boolean }) {
  const isUser = message.role === 'user'

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {isUser ? (
        <LinearGradient
          colors={['#10b981', '#14b8a6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            maxWidth: '80%',
            paddingHorizontal: 16, paddingVertical: 10,
            borderRadius: 16, borderBottomRightRadius: 4,
          }}
        >
          <Text style={{ fontSize: 14, lineHeight: 20, color: '#ffffff' }}>
            {message.content}
          </Text>
        </LinearGradient>
      ) : (
        <View style={{
          maxWidth: '80%',
          paddingHorizontal: 16, paddingVertical: 10,
          borderRadius: 16, borderBottomLeftRadius: 4,
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
        }}>
          <Text style={{
            fontSize: 14, lineHeight: 20,
            color: isDark ? 'rgba(255,255,255,0.9)' : '#1f2937',
          }}>
            {message.content}
          </Text>
        </View>
      )}
    </View>
  )
}

function BloomChatModal({ isOpen, onClose, isDark }: { isOpen: boolean; onClose: () => void; isDark: boolean }) {
  const [inputValue, setInputValue] = useState('')
  const [taglineIndex, setTaglineIndex] = useState(0)
  const taglineFade = useRef(new RNAnimated.Value(1)).current
  const scrollViewRef = useRef<ScrollView>(null)

  const {
    messages,
    isLoading,
    sendUserMessage,
    error,
    suggestions,
  } = useBloomChat({ locale: 'en', entryPoint: 'moments' })

  const displaySuggestions = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS
  const showSuggestions = !isLoading && messages.length > 0

  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      RNAnimated.timing(taglineFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setTaglineIndex(prev => (prev + 1) % TAGLINES.length)
        RNAnimated.timing(taglineFade, { toValue: 1, duration: 300, useNativeDriver: true }).start()
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [isOpen])

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    const msg = inputValue
    setInputValue('')
    await sendUserMessage(msg)
  }

  const handleSuggestion = async (suggestion: string) => {
    if (isLoading) return
    await sendUserMessage(suggestion)
  }

  const { height: screenHeight } = Dimensions.get('window')

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={onClose}
        >
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {}}
            style={{
              height: screenHeight * 0.7,
              backgroundColor: isDark ? '#1a1a1c' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 20,
            }}
          >
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
              paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: '#10b981',
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                  }} />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#ffffff' : '#111827' }}>
                    Bloom
                  </Text>
                  <RNAnimated.Text style={{
                    fontSize: 12, marginTop: 2,
                    color: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af',
                    opacity: taglineFade,
                  }}>
                    {TAGLINES[taglineIndex]}
                  </RNAnimated.Text>
                </View>
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

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} isDark={isDark} />
              ))}
              {isLoading && <TypingDots isDark={isDark} />}
              {error && (
                <Text style={{ textAlign: 'center', fontSize: 12, color: '#f87171', paddingVertical: 8 }}>
                  {error}
                </Text>
              )}
            </ScrollView>

            {/* Suggestions */}
            {showSuggestions && (
              <View style={{
                paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
                borderTopWidth: 1,
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: '500', marginBottom: 8, letterSpacing: 0.3,
                  color: isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af',
                }}>
                  Suggestions for you
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                  {displaySuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      onPress={() => handleSuggestion(suggestion)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        color: isDark ? 'rgba(255,255,255,0.65)' : '#4b5563',
                      }}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input */}
            <View style={{
              paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
              borderTopWidth: showSuggestions ? 0 : 1,
              borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="Type something..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af'}
                  editable={!isLoading}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  style={{
                    flex: 1, paddingHorizontal: 16, paddingVertical: 12,
                    borderRadius: 20, fontSize: 14,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                    color: isDark ? '#ffffff' : '#111827',
                  }}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10b981', '#14b8a6']}
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: (!inputValue.trim() || isLoading) ? 0.4 : 1,
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Send size={18} color="#ffffff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ============================================
// Mood Landscape Hero
// ============================================

function MoodLandscapeHero({
  moments,
  theme,
}: {
  moments: Moment[]
  theme: Record<string, string>
}) {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const recentMoments = moments.filter(m => new Date(m.created_at) >= weekAgo)

  // Build 7-day data (Mon through today)
  const weekDays = useMemo(() => {
    const days: { date: Date; moments: Moment[]; dominantMood: string | null }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const key = getDateKey(d)
      const dayMoments = moments.filter(m => getDateKey(new Date(m.created_at)) === key)
      days.push({
        date: d,
        moments: dayMoments,
        dominantMood: getDominantMood(dayMoments),
      })
    }
    return days
  }, [moments])

  // Mood counts for insight
  const moodCounts: Record<string, number> = {}
  recentMoments.forEach(m => {
    m.moods?.forEach(mood => { moodCounts[mood] = (moodCounts[mood] || 0) + 1 })
  })
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])
  const totalMoodCount = Object.values(moodCounts).reduce((a, b) => a + b, 0)
  const positiveCount = Object.entries(moodCounts)
    .filter(([mood]) => POSITIVE_MOODS.includes(mood))
    .reduce((sum, [, count]) => sum + count, 0)
  const positiveRatio = totalMoodCount > 0 ? positiveCount / totalMoodCount : 0

  const insight = useMemo(() => {
    if (recentMoments.length === 0) return 'No moments captured this week yet. Take a moment to capture what matters.'
    if (positiveRatio >= 0.7) return `You're in a beautiful flow. ${sortedMoods[0] ? `Feeling ${sortedMoods[0][0]} a lot lately.` : ''} Keep going.`
    if (positiveRatio >= 0.4) return 'A mix of ups and downs — every moment matters in your journey.'
    return 'This week feels heavy. Remember to be gentle with yourself.'
  }, [recentMoments.length, positiveRatio, sortedMoods])

  const topMood = sortedMoods[0]?.[0]

  // Gradient colors from first to last dominant mood
  const gradientColors = useMemo(() => {
    const firstMood = weekDays.find(d => d.dominantMood)?.dominantMood
    const lastMood = [...weekDays].reverse().find(d => d.dominantMood)?.dominantMood
    return [
      MOOD_COLORS[firstMood || 'calm'] || '#06b6d4',
      MOOD_COLORS[lastMood || 'peaceful'] || '#14b8a6',
    ] as [string, string]
  }, [weekDays])

  return (
    <View style={{
      marginHorizontal: 20, marginTop: 12,
      borderRadius: 24, padding: 20,
      backgroundColor: theme.cardBg,
      borderWidth: 1, borderColor: theme.cardBorder,
    }}>
      {/* 7-day dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {weekDays.map((day, i) => {
          const color = day.dominantMood ? (MOOD_COLORS[day.dominantMood] || '#6b7280') : theme.textFaint
          const size = day.moments.length === 0 ? 8 : Math.min(8 + day.moments.length * 3, 20)
          const dayLabel = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
          const d = day.date.getDay()
          const label = dayLabel[d === 0 ? 6 : d - 1]

          return (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: theme.textFaint, fontWeight: '500' }}>{label}</Text>
              <View style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: color,
                opacity: day.moments.length === 0 ? 0.4 : 1,
              }} />
            </View>
          )
        })}
      </View>

      {/* Gradient bar */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          height: 4, borderRadius: 2, marginBottom: 14, opacity: 0.85,
        }}
      />

      {/* AI insight */}
      <Text style={{ fontSize: 14, color: theme.textMuted, lineHeight: 20, marginBottom: 12 }}>
        {insight}
      </Text>

      {/* Stat pills */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
          backgroundColor: theme.toggleBg,
        }}>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '500' }}>
            {recentMoments.length} this week
          </Text>
        </View>
        {topMood && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
            backgroundColor: theme.toggleBg,
          }}>
            <View style={{
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: MOOD_COLORS[topMood] || '#6b7280',
            }} />
            <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '500', textTransform: 'capitalize' }}>
              {topMood}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ============================================
// Revisit Card
// ============================================

function RevisitCard({
  moments,
  theme,
  onOpenMoment,
}: {
  moments: Moment[]
  theme: Record<string, string>
  onOpenMoment: (m: Moment) => void
}) {
  const [revisitMoment, setRevisitMoment] = useState<Moment | null>(null)

  const pool = useMemo(() => {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 24)
    return moments.filter(m => {
      const hasPositiveMood = m.moods?.some(mood => POSITIVE_MOODS.includes(mood))
      const isOldEnough = new Date(m.created_at) < cutoff
      return hasPositiveMood && isOldEnough
    })
  }, [moments])

  useEffect(() => {
    if (pool.length > 0 && !revisitMoment) {
      setRevisitMoment(pool[Math.floor(Math.random() * pool.length)])
    }
  }, [pool])

  const pickAnother = useCallback(() => {
    if (pool.length <= 1) return
    let next: Moment
    do {
      next = pool[Math.floor(Math.random() * pool.length)]
    } while (next.id === revisitMoment?.id && pool.length > 1)
    setRevisitMoment(next)
  }, [pool, revisitMoment])

  if (!revisitMoment) return null

  const isPhoto = revisitMoment.type === 'photo' && revisitMoment.media_url

  return (
    <View style={{
      marginHorizontal: 20, marginTop: 12,
      borderRadius: 24, padding: 16,
      backgroundColor: theme.cardBg,
      borderWidth: 1, borderColor: theme.cardBorder,
    }}>
      <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
        REMEMBER THIS?
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onOpenMoment(revisitMoment)}
        style={{ flexDirection: 'row', gap: 12 }}
      >
        {/* Thumbnail */}
        {isPhoto ? (
          <Image
            source={{ uri: revisitMoment.media_url! }}
            style={{ width: 56, height: 56, borderRadius: 14 }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={typeGradient(revisitMoment.type)}
            style={{
              width: 56, height: 56, borderRadius: 14,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <TypeIcon type={revisitMoment.type} size={22} />
          </LinearGradient>
        )}

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: theme.text, lineHeight: 19 }} numberOfLines={2}>
            {revisitMoment.text_content || revisitMoment.caption || `${revisitMoment.type.charAt(0).toUpperCase() + revisitMoment.type.slice(1)} moment`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {revisitMoment.moods?.slice(0, 2).map(mood => (
              <View key={mood} style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
                backgroundColor: `${MOOD_COLORS[mood] || '#6b7280'}20`,
              }}>
                <View style={{
                  width: 5, height: 5, borderRadius: 2.5,
                  backgroundColor: MOOD_COLORS[mood] || '#6b7280',
                }} />
                <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'capitalize' }}>
                  {mood}
                </Text>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: theme.textFaint }}>
              {getTimeAgo(revisitMoment.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Another button */}
      {pool.length > 1 && (
        <TouchableOpacity
          onPress={pickAnother}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 12, paddingVertical: 8, borderRadius: 12,
            backgroundColor: theme.toggleBg,
          }}
        >
          <Shuffle size={13} color={theme.textMuted} />
          <Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '500' }}>Another</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ============================================
// Calendar View — Month in Pixels
// ============================================

function CalendarView({
  moments,
  theme,
  isDark,
  onOpenMoment,
}: {
  moments: Moment[]
  theme: Record<string, string>
  isDark: boolean
  onOpenMoment: (m: Moment) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Group moments by date
  const momentsByDate = useMemo(() => {
    const map: Record<string, Moment[]> = {}
    moments.forEach(m => {
      const key = getDateKey(new Date(m.created_at))
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return map
  }, [moments])

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = getDateKey(new Date())

    const cells: { date: Date | null; key: string; moments: Moment[]; dominantMood: string | null; isToday: boolean; isFuture: boolean }[] = []

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push({ date: null, key: `empty-${i}`, moments: [], dominantMood: null, isToday: false, isFuture: false })
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const key = getDateKey(date)
      const dayMoments = momentsByDate[key] || []
      cells.push({
        date,
        key,
        moments: dayMoments,
        dominantMood: getDominantMood(dayMoments),
        isToday: key === today,
        isFuture: date > new Date(),
      })
    }

    // Chunk into weeks
    const weeks: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    return weeks
  }, [currentMonth, momentsByDate])

  const selectedMoments = selectedDate ? (momentsByDate[selectedDate] || []) : []

  const monthLabel = currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })

  // Month stats
  const monthMoments = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return moments.filter(m => {
      const d = new Date(m.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [moments, currentMonth])

  const activeDays = useMemo(() => {
    const days = new Set<string>()
    monthMoments.forEach(m => days.add(getDateKey(new Date(m.created_at))))
    return days.size
  }, [monthMoments])

  const monthTopMood = getDominantMood(monthMoments)

  const cellSize = (SCREEN_WIDTH - 40 - 24) / 7 // 20px padding each side, 4px gap * 6

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
      {/* Month nav */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <TouchableOpacity
          onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          style={{
            width: 34, height: 34, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.toggleBg,
          }}
        >
          <ChevronLeftIcon size={18} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          style={{
            width: 34, height: 34, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: theme.toggleBg,
          }}
        >
          <ChevronRightIcon size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week labels */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={{ width: cellSize, alignItems: 'center', marginRight: i < 6 ? 4 : 0 }}>
            <Text style={{ fontSize: 11, color: theme.textFaint, fontWeight: '500' }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      {calendarGrid.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', marginBottom: 4 }}>
          {week.map((cell, ci) => {
            if (!cell.date) {
              return <View key={cell.key} style={{ width: cellSize, height: cellSize, marginRight: ci < 6 ? 4 : 0 }} />
            }

            if (cell.isFuture) {
              return (
                <View key={cell.key} style={{
                  width: cellSize, height: cellSize, marginRight: ci < 6 ? 4 : 0,
                  borderRadius: 8, backgroundColor: 'transparent',
                }} />
              )
            }

            const moodColor = cell.dominantMood ? (MOOD_COLORS[cell.dominantMood] || '#6b7280') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
            const isSelected = selectedDate === cell.key

            return (
              <TouchableOpacity
                key={cell.key}
                activeOpacity={0.7}
                onPress={() => setSelectedDate(isSelected ? null : cell.key)}
                style={{
                  width: cellSize, height: cellSize, marginRight: ci < 6 ? 4 : 0,
                  borderRadius: 8,
                  backgroundColor: moodColor,
                  opacity: cell.moments.length === 0 ? 0.5 : 1,
                  borderWidth: cell.isToday ? 2 : isSelected ? 2 : 0,
                  borderColor: cell.isToday ? theme.text : (isSelected ? '#10b981' : 'transparent'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cell.moments.length > 0 && (
                  <Text style={{
                    fontSize: 10, fontWeight: '600',
                    color: '#ffffff',
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}>
                    {cell.date.getDate()}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
          {/* Pad incomplete weeks */}
          {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
            <View key={`pad-${wi}-${i}`} style={{ width: cellSize, height: cellSize, marginRight: i < (6 - week.length) ? 4 : 0 }} />
          ))}
        </View>
      ))}

      {/* Selected day strip */}
      {selectedDate && (
        <View style={{ marginTop: 12 }}>
          {selectedMoments.length === 0 ? (
            <Text style={{ fontSize: 13, color: theme.textFaint, textAlign: 'center', paddingVertical: 12 }}>
              No moments this day
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
            >
              {selectedMoments.map(m => {
                const isPhoto = m.type === 'photo' && m.media_url

                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.8}
                    onPress={() => onOpenMoment(m)}
                    style={{
                      width: 130, borderRadius: 16, overflow: 'hidden',
                      backgroundColor: theme.cardBg,
                      borderWidth: 1, borderColor: theme.cardBorder,
                    }}
                  >
                    {isPhoto ? (
                      <Image
                        source={{ uri: m.media_url! }}
                        style={{ width: 130, height: 90 }}
                        resizeMode="cover"
                      />
                    ) : m.type === 'voice' ? (
                      <LinearGradient
                        colors={[theme.voiceGrad1, theme.voiceGrad2]}
                        style={{ width: 130, height: 90, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          {Array.from({ length: 8 }).map((_, i) => (
                            <View key={i} style={{
                              width: 3, borderRadius: 2,
                              height: getWaveformHeight(i),
                              backgroundColor: theme.voiceBar,
                            }} />
                          ))}
                        </View>
                      </LinearGradient>
                    ) : m.type === 'video' ? (
                      <View style={{
                        width: 130, height: 90,
                        backgroundColor: theme.videoBg,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <View style={{
                          width: 32, height: 32, borderRadius: 16,
                          backgroundColor: theme.videoPlayBg,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Play size={14} color="#ffffff" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                    ) : (
                      <View style={{
                        width: 130, height: 90, padding: 10,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fefce8',
                      }}>
                        <Text style={{ fontSize: 11, color: theme.textMuted, lineHeight: 16 }} numberOfLines={4}>
                          {m.text_content || m.caption || 'Written moment'}
                        </Text>
                      </View>
                    )}
                    <View style={{ padding: 8 }}>
                      <Text style={{ fontSize: 11, color: theme.textFaint }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Month stats */}
      <View style={{
        flexDirection: 'row', justifyContent: 'center', gap: 12,
        marginTop: 16, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: theme.cardBorder,
      }}>
        <Text style={{ fontSize: 12, color: theme.textFaint }}>
          {monthMoments.length} moments
        </Text>
        <Text style={{ fontSize: 12, color: theme.textFaint }}>·</Text>
        <Text style={{ fontSize: 12, color: theme.textFaint }}>
          {activeDays} days active
        </Text>
        {monthTopMood && (
          <>
            <Text style={{ fontSize: 12, color: theme.textFaint }}>·</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: MOOD_COLORS[monthTopMood] || '#6b7280',
              }} />
              <Text style={{ fontSize: 12, color: theme.textFaint, textTransform: 'capitalize' }}>
                {monthTopMood}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

// ============================================
// Gallery View — Weekly Chapters
// ============================================

function GalleryView({
  moments,
  theme,
  isDark,
  onOpenMoment,
}: {
  moments: Moment[]
  theme: Record<string, string>
  isDark: boolean
  onOpenMoment: (m: Moment) => void
}) {
  const now = new Date()
  const INITIAL_LIMIT = 20
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT)

  const visibleMoments = useMemo(() => moments.slice(0, visibleCount), [moments, visibleCount])
  const hasMore = moments.length > visibleCount
  const remaining = moments.length - visibleCount

  const weeklyGroups = useMemo(() => {
    if (visibleMoments.length === 0) return []

    const groups: { label: string; moments: Moment[]; dominantMood: string | null }[] = []
    const groupMap = new Map<string, Moment[]>()

    visibleMoments.forEach(m => {
      const label = getWeekLabel(new Date(m.created_at), now)
      if (!groupMap.has(label)) groupMap.set(label, [])
      groupMap.get(label)!.push(m)
    })

    groupMap.forEach((weekMoments, label) => {
      groups.push({
        label,
        moments: weekMoments,
        dominantMood: getDominantMood(weekMoments),
      })
    })

    return groups
  }, [visibleMoments])

  const colWidth = (SCREEN_WIDTH - 40 - 10) / 2 // 20px padding each side, 10px gap

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
      {weeklyGroups.map((group, gi) => (
        <View key={gi} style={{ marginBottom: 24 }}>
          {/* Week header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            marginBottom: 12,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
              {group.label}
            </Text>
            {group.dominantMood && (
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: MOOD_COLORS[group.dominantMood] || '#6b7280',
              }} />
            )}
            <Text style={{ fontSize: 12, color: theme.textFaint }}>
              {group.moments.length} moment{group.moments.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Masonry 2-column layout */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Left column */}
            <View style={{ width: colWidth, gap: 10 }}>
              {group.moments.filter((_, i) => i % 2 === 0).map((m, mi) => (
                <MasonryCard
                  key={m.id}
                  moment={m}
                  theme={theme}
                  isDark={isDark}
                  width={colWidth}
                  isLeft
                  index={mi}
                  onPress={() => onOpenMoment(m)}
                />
              ))}
            </View>
            {/* Right column */}
            <View style={{ width: colWidth, gap: 10 }}>
              {group.moments.filter((_, i) => i % 2 === 1).map((m, mi) => (
                <MasonryCard
                  key={m.id}
                  moment={m}
                  theme={theme}
                  isDark={isDark}
                  width={colWidth}
                  isLeft={false}
                  index={mi}
                  onPress={() => onOpenMoment(m)}
                />
              ))}
            </View>
          </View>
        </View>
      ))}

      {/* View more */}
      {hasMore && (
        <TouchableOpacity
          onPress={() => setVisibleCount(prev => prev + 20)}
          activeOpacity={0.7}
          style={{
            alignItems: 'center', paddingVertical: 14, borderRadius: 14,
            backgroundColor: theme.toggleBg, marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textMuted }}>
            View more ({remaining})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function MasonryCard({
  moment: m,
  theme,
  isDark,
  width,
  isLeft,
  index,
  onPress,
}: {
  moment: Moment
  theme: Record<string, string>
  isDark: boolean
  width: number
  isLeft: boolean
  index: number
  onPress: () => void
}) {
  const isPhoto = m.type === 'photo' && m.media_url
  const isVideo = m.type === 'video'
  const isVoice = m.type === 'voice'

  // Alternating aspect ratios for visual variety
  const photoAspect = (isLeft ? (index % 2 === 0) : (index % 2 === 1)) ? 3 / 4 : 1

  const dominantMood = m.moods?.[0]
  const moodColor = dominantMood ? (MOOD_COLORS[dominantMood] || '#6b7280') : theme.textFaint

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        borderRadius: 16, overflow: 'hidden',
        backgroundColor: theme.cardBg,
        borderWidth: 1, borderColor: theme.cardBorder,
      }}
    >
      {isPhoto ? (
        <Image
          source={{ uri: m.media_url! }}
          style={{ width, aspectRatio: photoAspect }}
          resizeMode="cover"
        />
      ) : isVideo ? (
        <View style={{
          width, aspectRatio: 3 / 4,
          backgroundColor: theme.videoBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: theme.videoPlayBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Play size={18} color="#ffffff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      ) : isVoice ? (
        <LinearGradient
          colors={[theme.voiceGrad1, theme.voiceGrad2]}
          style={{
            width, height: 100,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{
                width: 3, borderRadius: 2,
                height: getWaveformHeight(i),
                backgroundColor: theme.voiceBar,
              }} />
            ))}
          </View>
          {m.duration_seconds && (
            <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 8 }}>
              {Math.floor(m.duration_seconds / 60)}:{String(m.duration_seconds % 60).padStart(2, '0')}
            </Text>
          )}
        </LinearGradient>
      ) : (
        // Write moment
        <LinearGradient
          colors={[theme.writeGrad1, theme.writeGrad2]}
          style={{
            width, minHeight: 100, padding: 14,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.7)' : '#92400e', lineHeight: 18 }} numberOfLines={5}>
            {m.text_content || m.caption || 'Written moment'}
          </Text>
        </LinearGradient>
      )}

      {/* Mood color strip + time */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 10, paddingVertical: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{
            width: 16, height: 3, borderRadius: 1.5,
            backgroundColor: moodColor,
          }} />
          {m.moods?.[0] && (
            <Text style={{ fontSize: 10, color: theme.textFaint, textTransform: 'capitalize' }}>
              {m.moods[0]}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 10, color: theme.textFaint }}>
          {getTimeAgo(m.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ============================================
// Main Screen
// ============================================

export default function MomentsScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'calendar' | 'gallery'>('gallery')
  const [isDark, setIsDark] = useState(true)
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null)
  const [, setDeleting] = useState(false)
  const [isBloomOpen, setIsBloomOpen] = useState(false)

  const fetchMoments = useCallback(async () => {
    if (!user) return
    const data = await getMemberMoments(500)
    setMoments(data)
    setLoading(false)
  }, [user?.id])

  // Load saved theme preference
  useEffect(() => {
    getUserPreferences().then(prefs => {
      setIsDark(prefs.moments_theme === 'dark')
    })
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    updateUserPreferences({ moments_theme: next ? 'dark' : 'light' })
  }

  useFocusEffect(useCallback(() => { fetchMoments() }, [fetchMoments]))

  async function onRefresh() {
    setRefreshing(true)
    await fetchMoments()
    setRefreshing(false)
  }

  async function performDelete(momentId: string) {
    setDeleting(true)
    try {
      const success = await deleteMoment(momentId)
      if (success) {
        setMoments(prev => prev.filter(m => m.id !== momentId))
        setSelectedMoment(null)
      }
    } catch (e) {
      console.error('Delete failed:', e)
    } finally {
      setDeleting(false)
    }
  }

  function handleDelete(momentId: string) {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this moment?')) {
        performDelete(momentId)
      }
    } else {
      Alert.alert('Delete moment', 'Are you sure you want to delete this moment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(momentId),
        },
      ])
    }
  }

  // Theme
  const theme = {
    bg: isDark ? '#0c0c0e' : '#f5f3ef',
    text: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#4b5563',
    textFaint: isDark ? 'rgba(255,255,255,0.3)' : '#6b7280',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    toggleBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    accentBg: isDark ? '#ffffff' : '#1a1a1a',
    accentText: isDark ? '#000000' : '#ffffff',
    divider: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    moodTagBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    moodTagText: isDark ? 'rgba(255,255,255,0.5)' : '#4b5563',
    voiceGrad1: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(221,214,254,1)',
    voiceGrad2: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(233,213,255,1)',
    voiceBar: isDark ? 'rgba(167,139,250,0.6)' : 'rgba(139,92,246,0.5)',
    voicePlayBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)',
    voicePlayIcon: isDark ? '#ffffff' : '#7c3aed',
    writeGrad1: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(254,243,199,1)',
    writeGrad2: isDark ? 'rgba(234,88,12,0.2)' : 'rgba(255,237,213,1)',
    writeIcon: isDark ? 'rgba(251,191,36,0.5)' : 'rgba(217,119,6,0.5)',
    videoBg: isDark ? '#1a1a1c' : '#111827',
    videoPlayBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)',
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0c0c0e' : '#f8f7f4', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* ===== Header ===== */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 34, height: 34, borderRadius: 11,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.toggleBg,
                }}
              >
                <ChevronLeftIcon size={20} color={theme.textMuted} />
              </TouchableOpacity>
              <View>
              <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, letterSpacing: -0.5 }}>
                Moments
              </Text>
              {moments.length > 0 && (
                <Text style={{ fontSize: 13, color: theme.textFaint, marginTop: 2 }}>
                  {moments.length} captured
                </Text>
              )}
              </View>
            </View>

            {/* Theme toggle + Add button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={toggleTheme}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.toggleBg,
                }}
              >
                {isDark ? <Sun size={18} color={theme.textMuted} /> : <Moon size={18} color={theme.textMuted} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/capture')}
                activeOpacity={0.8}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.accentBg,
                }}
              >
                <Plus size={18} color={theme.accentText} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {moments.length === 0 ? (
          /* ===== Empty State ===== */
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 24,
              backgroundColor: theme.cardBg,
              borderWidth: 1, borderColor: theme.cardBorder,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Sun size={36} color={theme.textFaint} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '500', color: theme.text, marginBottom: 8 }}>
              No moments yet
            </Text>
            <Text style={{ fontSize: 14, color: theme.textFaint, textAlign: 'center', lineHeight: 20, paddingHorizontal: 40 }}>
              What's on your mind? Capture it.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/capture')}
              activeOpacity={0.8}
              style={{ marginTop: 24 }}
            >
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16,
                backgroundColor: theme.accentBg,
              }}>
                <Plus size={16} color={theme.accentText} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.accentText }}>Capture a moment</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ===== Mood Landscape Hero ===== */}
            <MoodLandscapeHero moments={moments} theme={theme} />

            {/* ===== Revisit Card ===== */}
            <RevisitCard
              moments={moments}
              theme={theme}
              onOpenMoment={setSelectedMoment}
            />

            {/* ===== View Toggle ===== */}
            <View style={{
              flexDirection: 'row', marginHorizontal: 20, marginTop: 16,
              backgroundColor: theme.toggleBg, borderRadius: 14, padding: 3,
            }}>
              <TouchableOpacity
                onPress={() => setViewMode('gallery')}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 10, borderRadius: 11,
                  backgroundColor: viewMode === 'gallery' ? theme.accentBg : 'transparent',
                }}
              >
                <LayoutGrid size={15} color={viewMode === 'gallery' ? theme.accentText : theme.textMuted} />
                <Text style={{
                  fontSize: 13, fontWeight: '600',
                  color: viewMode === 'gallery' ? theme.accentText : theme.textMuted,
                }}>
                  Gallery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode('calendar')}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 10, borderRadius: 11,
                  backgroundColor: viewMode === 'calendar' ? theme.accentBg : 'transparent',
                }}
              >
                <Calendar size={15} color={viewMode === 'calendar' ? theme.accentText : theme.textMuted} />
                <Text style={{
                  fontSize: 13, fontWeight: '600',
                  color: viewMode === 'calendar' ? theme.accentText : theme.textMuted,
                }}>
                  Calendar
                </Text>
              </TouchableOpacity>
            </View>

            {/* ===== Calendar or Gallery ===== */}
            {viewMode === 'calendar' ? (
              <CalendarView
                moments={moments}
                theme={theme}
                isDark={isDark}
                onOpenMoment={setSelectedMoment}
              />
            ) : (
              <GalleryView
                moments={moments}
                theme={theme}
                isDark={isDark}
                onOpenMoment={setSelectedMoment}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ===== Moment Detail Modal ===== */}
      <Modal
        visible={!!selectedMoment}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMoment(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setSelectedMoment(null)}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              backgroundColor: isDark ? '#111113' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '90%',
            }}
          >
            {selectedMoment && (
              <>
                {/* Handle */}
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
                </View>

                {/* Header */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 20, paddingBottom: 16,
                  borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <LinearGradient
                      colors={typeGradient(selectedMoment.type)}
                      style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <TypeIcon type={selectedMoment.type} size={16} />
                    </LinearGradient>
                    <Text style={{ fontSize: 13, color: theme.textMuted }}>
                      {new Date(selectedMoment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      {' · '}
                      {getTimeAgo(selectedMoment.created_at)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => handleDelete(selectedMoment.id)}
                      style={{ padding: 10, borderRadius: 12, backgroundColor: theme.cardBg }}
                    >
                      <Trash2 size={18} color={theme.textFaint} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedMoment(null)}
                      style={{ padding: 10, borderRadius: 12, backgroundColor: theme.cardBg }}
                    >
                      <X size={18} color={theme.textFaint} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Content */}
                <ScrollView style={{ maxHeight: 500 }}>
                  {selectedMoment.type === 'photo' && selectedMoment.media_url && (
                    <Image
                      source={{ uri: selectedMoment.media_url }}
                      style={{ width: '100%', aspectRatio: 1 }}
                      resizeMode="contain"
                    />
                  )}

                  <View style={{ padding: 20, gap: 16 }}>
                    {selectedMoment.text_content && (
                      <Text style={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.8)' : '#1f2937', lineHeight: 24 }}>
                        {selectedMoment.text_content}
                      </Text>
                    )}

                    {selectedMoment.caption && selectedMoment.type !== 'write' && (
                      <Text style={{ fontSize: 14, color: theme.textMuted, lineHeight: 20 }}>
                        {selectedMoment.caption}
                      </Text>
                    )}

                    {selectedMoment.moods && selectedMoment.moods.length > 0 && (
                      <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', paddingTop: 16 }}>
                        <Text style={{ fontSize: 11, color: theme.textFaint, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
                          EMOTIONS
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {selectedMoment.moods.map(mood => (
                            <View key={mood} style={{
                              flexDirection: 'row', alignItems: 'center', gap: 5,
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                              backgroundColor: `${MOOD_COLORS[mood] || '#6b7280'}20`,
                            }}>
                              <View style={{
                                width: 6, height: 6, borderRadius: 3,
                                backgroundColor: MOOD_COLORS[mood] || '#6b7280',
                              }} />
                              <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.7)' : '#374151', textTransform: 'capitalize' }}>
                                {mood}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ===== Bloom Pill ===== */}
      <BloomPill isDark={isDark} onPress={() => setIsBloomOpen(true)} />

      {/* ===== Bloom Chat Modal ===== */}
      <BloomChatModal isOpen={isBloomOpen} onClose={() => setIsBloomOpen(false)} isDark={isDark} />
    </SafeAreaView>
  )
}
