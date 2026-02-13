import { useState, useCallback, useEffect, useRef } from 'react'
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
  Grid3X3,
  List,
  Heart,
  X,
  Trash2,
  Play,
  SlidersHorizontal,
  Check,
  Sun,
  Moon,
  Send,
  ChevronLeft,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { getMemberMoments, deleteMoment, type Moment } from '@/lib/services/moments'
import { useBloomChat, type BloomMessage } from '@/lib/hooks/useBloomChat'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const MOOD_OPTIONS = [
  'grateful', 'peaceful', 'joyful', 'inspired', 'loved',
  'calm', 'hopeful', 'proud', 'overwhelmed', 'tired', 'uncertain',
]

const POSITIVE_MOODS = ['grateful', 'peaceful', 'joyful', 'inspired', 'loved', 'calm', 'hopeful', 'proud']

type DateFilter = 'today' | 'week' | 'month' | 'all'

function TypeIcon({ type, size = 18 }: { type: string; size?: number }) {
  const color = '#fff'
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

const BLOOM_PROMPTS = [
  'How are you feeling?',
  'What\'s on your mind?',
  'Tell me about your day',
  'Need someone to talk to?',
  'What made you smile today?',
  'Share your thoughts...',
]

function BloomPill({ isDark, onPress }: { isDark: boolean; onPress?: () => void }) {
  const [promptIndex, setPromptIndex] = useState(0)
  const fadeAnim = useRef(new RNAnimated.Value(1)).current
  const pulseAnim = useRef(new RNAnimated.Value(1)).current

  useEffect(() => {
    // Pulse animation for the orb
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      RNAnimated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setPromptIndex(prev => (prev + 1) % BLOOM_PROMPTS.length)
        // Fade in
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
      })
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <View style={{
      position: 'absolute', bottom: 24, left: 0, right: 0,
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
        {/* Animated orb */}
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

        {/* Rotating prompt */}
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

  // Rotate taglines
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

  // Auto-scroll on new messages
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
          {/* Spacer pushes chat to bottom */}
          <View style={{ flex: 1 }} />

          {/* Chat container */}
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
                {/* Pulsing dot */}
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

            {/* Messages — takes all available space */}
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

export default function MomentsScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isDark, setIsDark] = useState(true)
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null)
  const [, setDeleting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [isBloomOpen, setIsBloomOpen] = useState(false)

  const fetchMoments = useCallback(async () => {
    if (!user) return
    const data = await getMemberMoments(500)
    setMoments(data)
    setLoading(false)
  }, [user?.id])

  useFocusEffect(useCallback(() => { fetchMoments() }, [fetchMoments]))

  async function onRefresh() {
    setRefreshing(true)
    await fetchMoments()
    setRefreshing(false)
  }

  async function handleDelete(momentId: string) {
    Alert.alert('Delete moment', 'Are you sure you want to delete this moment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          const success = await deleteMoment(momentId)
          if (success) {
            setMoments(prev => prev.filter(m => m.id !== momentId))
            setSelectedMoment(null)
          }
          setDeleting(false)
        },
      },
    ])
  }

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    )
  }

  // Filter moments
  const filteredMoments = moments.filter(m => {
    if (selectedMoods.length > 0) {
      const hasMood = selectedMoods.some(mood => m.moods?.includes(mood))
      if (!hasMood) return false
    }
    if (dateFilter !== 'all') {
      const mDate = new Date(m.created_at)
      const now = new Date()
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        if (mDate < today) return false
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (mDate < weekAgo) return false
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        if (mDate < monthAgo) return false
      }
    }
    return true
  })

  const hasActiveFilters = selectedMoods.length > 0 || dateFilter !== 'today'

  // Mood insights from last 7 days
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const recentMoments = moments.filter(m => new Date(m.created_at) >= weekAgo)
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

  const getInsight = () => {
    if (recentMoments.length === 0) return 'No moments captured this week yet. Take a moment to capture what matters.'
    if (positiveRatio >= 0.7) return `You're going through a beautiful time. ${sortedMoods[0] ? `You've been feeling ${sortedMoods[0][0]} a lot.` : ''} Keep it up.`
    if (positiveRatio >= 0.4) return 'Ups and downs are normal. Every moment matters in your journey.'
    return 'This week seems tough. Remember to take care of yourself.'
  }

  // Theme colors — matched to web app (Next.js moments page)
  const theme = {
    bg: isDark ? '#0c0c0e' : '#f8f7f4',
    text: isDark ? '#ffffff' : '#111827',         // text-gray-900
    textMuted: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',  // text-gray-500
    textFaint: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af',  // text-gray-400
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',    // bg-white in light
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    toggleBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    accentBg: isDark ? '#ffffff' : '#111827',     // bg-gray-900 in light
    accentText: isDark ? '#000000' : '#ffffff',
    divider: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    moodTagBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',  // bg-white/10 vs bg-black/5
    moodTagText: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
    filterActiveBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    filterActiveBorder: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
    filterActiveText: isDark ? '#ffffff' : '#111827',
    // Voice waveform colors
    voiceGrad1: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(221,214,254,1)',   // violet-100
    voiceGrad2: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(233,213,255,1)',   // purple-100
    voiceBar: isDark ? 'rgba(167,139,250,0.6)' : 'rgba(139,92,246,0.5)',
    voicePlayBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)',
    voicePlayIcon: isDark ? '#ffffff' : '#7c3aed',
    // Text-only / write fallback
    writeGrad1: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(254,243,199,1)',   // amber-100
    writeGrad2: isDark ? 'rgba(234,88,12,0.2)' : 'rgba(255,237,213,1)',    // orange-100
    writeIcon: isDark ? 'rgba(251,191,36,0.5)' : 'rgba(217,119,6,0.5)',
    // Video placeholder
    videoBg: isDark ? '#1a1a1c' : '#111827',
    videoPlayBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)',
  }

  const gridCardWidth = (SCREEN_WIDTH - 40 - 12) / 2

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
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: theme.toggleBg,
                }}
              >
                <ChevronLeft size={20} color={theme.textMuted} />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text, letterSpacing: -0.5 }}>
                  Moments
                </Text>
                {moments.length > 0 && (
                  <Text style={{ fontSize: 13, color: theme.textFaint, marginTop: 2 }}>
                    {moments.length} captured
                  </Text>
                )}
              </View>
            </View>

            {/* View + Theme toggle */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: theme.toggleBg,
              borderRadius: 12, padding: 3,
            }}>
              <TouchableOpacity
                onPress={() => setViewMode('grid')}
                style={{
                  padding: 8, borderRadius: 9,
                  backgroundColor: viewMode === 'grid' ? theme.accentBg : 'transparent',
                }}
              >
                <Grid3X3 size={16} color={viewMode === 'grid' ? theme.accentText : theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode('list')}
                style={{
                  padding: 8, borderRadius: 9,
                  backgroundColor: viewMode === 'list' ? theme.accentBg : 'transparent',
                }}
              >
                <List size={16} color={viewMode === 'list' ? theme.accentText : theme.textMuted} />
              </TouchableOpacity>
              <View style={{ width: 1, height: 16, backgroundColor: theme.divider, marginHorizontal: 3 }} />
              <TouchableOpacity
                onPress={() => setIsDark(!isDark)}
                style={{ padding: 8, borderRadius: 9 }}
              >
                {isDark ? <Sun size={16} color={theme.textMuted} /> : <Moon size={16} color={theme.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter + Add row */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                backgroundColor: hasActiveFilters ? theme.filterActiveBg : theme.cardBg,
                borderWidth: 1,
                borderColor: hasActiveFilters ? theme.filterActiveBorder : theme.cardBorder,
              }}
            >
              <SlidersHorizontal size={14} color={hasActiveFilters ? theme.filterActiveText : theme.textMuted} />
              <Text style={{ fontSize: 13, color: hasActiveFilters ? theme.filterActiveText : theme.textMuted }}>
                Filters{hasActiveFilters ? ` (${selectedMoods.length + (dateFilter !== 'today' ? 1 : 0)})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/capture')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                backgroundColor: theme.accentBg,
              }}
            >
              <Plus size={14} color={theme.accentText} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: theme.accentText }}>Add</Text>
            </TouchableOpacity>

            {moments.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  const rand = moments[Math.floor(Math.random() * moments.length)]
                  setSelectedMoment(rand)
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                  backgroundColor: theme.cardBg,
                  borderWidth: 1, borderColor: theme.cardBorder,
                }}
              >
                <Sparkles size={14} color={theme.textMuted} />
                <Text style={{ fontSize: 13, color: theme.textMuted }}>Revisit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter panel */}
          {showFilters && (
            <View style={{
              marginTop: 12, padding: 16, borderRadius: 20,
              backgroundColor: theme.cardBg,
              borderWidth: 1, borderColor: theme.cardBorder,
            }}>
              {/* Date filter */}
              <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
                TIME PERIOD
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {([
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This week' },
                  { value: 'month', label: 'This month' },
                  { value: 'all', label: 'All' },
                ] as const).map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDateFilter(opt.value)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: dateFilter === opt.value ? theme.accentBg : theme.cardBg,
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      color: dateFilter === opt.value ? theme.accentText : theme.textMuted,
                      fontWeight: dateFilter === opt.value ? '600' : '400',
                    }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mood filter */}
              <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
                EMOTIONS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MOOD_OPTIONS.map(mood => (
                  <TouchableOpacity
                    key={mood}
                    onPress={() => toggleMood(mood)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: selectedMoods.includes(mood) ? theme.accentBg : theme.cardBg,
                    }}
                  >
                    {selectedMoods.includes(mood) && <Check size={12} color={theme.accentText} />}
                    <Text style={{
                      fontSize: 13, textTransform: 'capitalize',
                      color: selectedMoods.includes(mood) ? theme.accentText : theme.textMuted,
                    }}>
                      {mood}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={() => { setSelectedMoods([]); setDateFilter('today') }}
                  style={{ marginTop: 12 }}
                >
                  <Text style={{ fontSize: 13, color: theme.textMuted }}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Mood Insights */}
        {moments.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 12, marginBottom: 8 }}>
            <View style={{
              borderRadius: 24, padding: 20,
              backgroundColor: theme.cardBg,
              borderWidth: 1, borderColor: theme.cardBorder,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <LinearGradient
                  colors={['#fb7185', '#ec4899']}
                  style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Heart size={16} color="#ffffff" />
                </LinearGradient>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>How you're doing</Text>
                  <Text style={{ fontSize: 11, color: theme.textFaint }}>This week</Text>
                </View>
              </View>

              <Text style={{ fontSize: 14, color: theme.textMuted, lineHeight: 20, marginBottom: 12 }}>
                {getInsight()}
              </Text>

              {sortedMoods.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {sortedMoods.slice(0, 4).map(([mood, count]) => (
                    <View key={mood} style={{
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                      backgroundColor: POSITIVE_MOODS.includes(mood) ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                    }}>
                      <Text style={{
                        fontSize: 12, fontWeight: '500', textTransform: 'capitalize',
                        color: POSITIVE_MOODS.includes(mood) ? '#6ee7b7' : '#c4b5fd',
                      }}>
                        {mood} x{count}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Content */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          {/* Date filter chips - always visible */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginBottom: 16 }}
          >
            {([
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
              { value: 'all', label: 'All time' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setDateFilter(opt.value)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
                  backgroundColor: dateFilter === opt.value ? theme.accentBg : theme.cardBg,
                  borderWidth: 1,
                  borderColor: dateFilter === opt.value ? theme.accentBg : theme.cardBorder,
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: dateFilter === opt.value ? '600' : '400',
                  color: dateFilter === opt.value ? theme.accentText : theme.textMuted,
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredMoments.length === 0 && moments.length === 0 ? (
            /* Empty state - no moments at all */
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
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
          ) : filteredMoments.length === 0 ? (
            /* No results for current filter */
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 16,
                backgroundColor: theme.cardBg,
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <Sun size={24} color={theme.textFaint} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '500', color: theme.text, marginBottom: 4 }}>
                {dateFilter === 'today' ? 'No moments today yet' : 'No moments found'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textFaint, textAlign: 'center', marginBottom: 16 }}>
                {dateFilter === 'today' ? "What's on your mind? Capture it." : 'Try a different filter.'}
              </Text>
              {dateFilter === 'today' && moments.length > 0 && (
                <TouchableOpacity onPress={() => setDateFilter('all')} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: theme.textMuted, textDecorationLine: 'underline' }}>
                    View past moments ({moments.length})
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => router.push('/capture')}
                activeOpacity={0.8}
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
          ) : viewMode === 'grid' ? (
            /* Grid View - 2 columns */
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {filteredMoments.map((m) => {
                const isPhoto = m.type === 'photo' && m.media_url
                const isVideo = m.type === 'video' && m.media_url
                const isVoice = m.type === 'voice' && m.media_url

                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setSelectedMoment(m)}
                    activeOpacity={0.8}
                    style={{
                      width: gridCardWidth,
                      borderRadius: 16, overflow: 'hidden',
                      backgroundColor: theme.cardBg,
                      borderWidth: 1, borderColor: theme.cardBorder,
                      padding: 12,
                      minHeight: 140,
                    }}
                  >
                    {/* Media thumbnail */}
                    {isPhoto && (
                      <Image
                        source={{ uri: m.media_url! }}
                        style={{
                          width: '100%', aspectRatio: 16 / 9,
                          borderRadius: 12, marginBottom: 10,
                        }}
                        resizeMode="cover"
                      />
                    )}

                    {isVideo && (
                      <View style={{
                        width: '100%', aspectRatio: 16 / 9,
                        borderRadius: 12, marginBottom: 10,
                        backgroundColor: theme.videoBg,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <View style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: theme.videoPlayBg,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Play size={16} color="#ffffff" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                    )}

                    {isVoice && (
                      <LinearGradient
                        colors={[theme.voiceGrad1, theme.voiceGrad2]}
                        style={{
                          width: '100%', aspectRatio: 16 / 9,
                          borderRadius: 12, marginBottom: 10,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {/* Waveform bars */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <View key={i} style={{
                              width: 3, borderRadius: 2,
                              height: 8 + Math.random() * 16,
                              backgroundColor: theme.voiceBar,
                            }} />
                          ))}
                        </View>
                      </LinearGradient>
                    )}

                    {!isPhoto && !isVideo && !isVoice && !m.text_content && !m.caption && (
                      <LinearGradient
                        colors={[theme.writeGrad1, theme.writeGrad2]}
                        style={{
                          width: '100%', aspectRatio: 16 / 9,
                          borderRadius: 12, marginBottom: 10,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <PenLine size={28} color={theme.writeIcon} />
                      </LinearGradient>
                    )}

                    {/* Text content */}
                    {(m.text_content || m.caption) && (
                      <Text
                        style={{ fontSize: 13, color: theme.text, lineHeight: 18, flex: 1 }}
                        numberOfLines={3}
                      >
                        {m.text_content || m.caption}
                      </Text>
                    )}

                    {/* Bottom: moods + time */}
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8,
                    }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                        {m.moods?.slice(0, 2).map(mood => (
                          <View key={mood} style={{
                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
                            backgroundColor: theme.moodTagBg,
                          }}>
                            <Text style={{ fontSize: 10, color: theme.moodTagText, textTransform: 'capitalize' }}>
                              {mood}
                            </Text>
                          </View>
                        ))}
                        {(m.moods?.length ?? 0) > 2 && (
                          <Text style={{ fontSize: 10, color: theme.textFaint }}>
                            +{m.moods!.length - 2}
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textFaint }}>
                        {getTimeAgo(m.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : (
            /* List View */
            <View style={{ gap: 8 }}>
              {filteredMoments.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setSelectedMoment(m)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    padding: 12, borderRadius: 16,
                    backgroundColor: theme.cardBg,
                    borderWidth: 1, borderColor: theme.cardBorder,
                  }}
                >
                  {/* Thumbnail */}
                  {m.type === 'photo' && m.media_url ? (
                    <Image
                      source={{ uri: m.media_url }}
                      style={{ width: 56, height: 56, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : m.type === 'voice' && m.media_url ? (
                    <LinearGradient
                      colors={[theme.voiceGrad1, theme.voiceGrad2]}
                      style={{
                        width: 56, height: 56, borderRadius: 12,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Play size={18} color={theme.voicePlayIcon} style={{ marginLeft: 2 }} />
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={typeGradient(m.type)}
                      style={{
                        width: 56, height: 56, borderRadius: 12,
                        alignItems: 'center', justifyContent: 'center', opacity: 0.7,
                      }}
                    >
                      <TypeIcon type={m.type} size={22} />
                    </LinearGradient>
                  )}

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: theme.text }} numberOfLines={1}>
                      {m.text_content || m.caption || `${m.type.charAt(0).toUpperCase() + m.type.slice(1)} moment`}
                    </Text>
                    {m.moods && m.moods.length > 0 && (
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {m.moods.slice(0, 3).map(mood => (
                          <View key={mood} style={{
                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
                            backgroundColor: theme.moodTagBg,
                          }}>
                            <Text style={{ fontSize: 10, color: theme.moodTagText, textTransform: 'capitalize' }}>
                              {mood}
                            </Text>
                          </View>
                        ))}
                        {m.moods.length > 3 && (
                          <Text style={{ fontSize: 10, color: theme.textFaint, alignSelf: 'center' }}>
                            +{m.moods.length - 3}
                          </Text>
                        )}
                      </View>
                    )}
                    <Text style={{ fontSize: 11, color: theme.textFaint, marginTop: 4 }}>
                      {getTimeAgo(m.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Moment Detail Modal */}
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
          <Pressable
            style={{
              backgroundColor: isDark ? '#111113' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '90%',
            }}
            onPress={() => {}}
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
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                              backgroundColor: theme.moodTagBg,
                            }}>
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bloom pill at bottom */}
      <BloomPill isDark={isDark} onPress={() => setIsBloomOpen(true)} />

      {/* Bloom Chat Modal */}
      <BloomChatModal isOpen={isBloomOpen} onClose={() => setIsBloomOpen(false)} isDark={isDark} />
    </SafeAreaView>
  )
}
