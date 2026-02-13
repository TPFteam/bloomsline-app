import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle as SvgCircle } from 'react-native-svg'
import {
  Check,
  Sun,
  Moon,
  Coffee,
  Heart,
  Plus,
  X,
  Eye,
  Sprout,
  StretchHorizontal,
  MapPin,
  Music,
  Cloud,
  RefreshCw,
  List,
  Gift,
  Hand,
  Stars,
  CalendarHeart,
  Sofa,
  Mail,
  Smile,
  Shield,
  Play,
  Pause,
  RotateCcw,
  Laugh,
  SmilePlus,
  Meh,
  Frown,
  Angry,
  History,
  Info,
  Calendar,
} from 'lucide-react-native'
import { useRituals } from '@/lib/hooks/useRituals'
import { type RitualCategory, type Ritual } from '@/lib/services/rituals'

// ============================================
// CONSTANTS
// ============================================

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'eye': Eye, 'coffee': Coffee, 'sprout': Sprout,
  'stretch-horizontal': StretchHorizontal, 'sun': Sun, 'map-pin': MapPin,
  'music': Music, 'cloud': Cloud, 'refresh-cw': RefreshCw, 'heart': Heart,
  'list': List, 'gift': Gift, 'moon': Moon, 'hand': Hand, 'stars': Stars,
  'calendar-heart': CalendarHeart, 'sofa': Sofa, 'mail': Mail,
  'smile': Smile, 'shield': Shield,
}

const CATEGORY_THEMES: Record<RitualCategory, {
  bg: string; accent: string; lightBg: string
  gradient: [string, string]; icon: React.ComponentType<{ size?: number; color?: string }>
  label: string; desc: string
}> = {
  morning: { bg: '#fffbeb', accent: '#f59e0b', lightBg: '#fef3c7', gradient: ['#fbbf24', '#f59e0b'], icon: Sun, label: 'Morning', desc: 'Before noon' },
  midday: { bg: '#ecfdf5', accent: '#059669', lightBg: '#d1fae5', gradient: ['#34d399', '#059669'], icon: Coffee, label: 'Afternoon', desc: 'Noon to 5pm' },
  evening: { bg: '#eef2ff', accent: '#6366f1', lightBg: '#e0e7ff', gradient: ['#818cf8', '#6366f1'], icon: Moon, label: 'Evening', desc: 'After 5pm' },
  selfcare: { bg: '#fdf2f8', accent: '#ec4899', lightBg: '#fce7f3', gradient: ['#f472b6', '#ec4899'], icon: Heart, label: 'Self-care', desc: 'Anytime' },
}

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', icon: Laugh, color: '#059669', bg: '#ecfdf5' },
  { value: 'good', label: 'Good', icon: SmilePlus, color: '#22c55e', bg: '#f0fdf4' },
  { value: 'okay', label: 'Okay', icon: Meh, color: '#eab308', bg: '#fefce8' },
  { value: 'low', label: 'Low', icon: Frown, color: '#f97316', bg: '#fff7ed' },
  { value: 'difficult', label: 'Difficult', icon: Angry, color: '#ef4444', bg: '#fef2f2' },
]

const AVAILABLE_ICONS = [
  'heart', 'sun', 'moon', 'coffee', 'eye', 'sprout', 'music', 'cloud',
  'stars', 'smile', 'shield', 'gift', 'hand', 'mail', 'sofa',
]

const MOOD_PROMPTS: Record<string, string[]> = {
  great: ["Amazing! What made this moment special?", "You're glowing! What sparked this joy?", "Wonderful! What are you grateful for right now?"],
  good: ["What felt good about this?", "Nice work! What's one thing you noticed?", "Well done! Any insights to capture?"],
  okay: ["Anything you'd like to capture?", "You showed up — that matters. Any thoughts?", "Sometimes okay is enough. What's on your mind?"],
  low: ["What would help you right now?", "It's okay to feel this way. What do you need?", "Be gentle with yourself. What's one small comfort?"],
  difficult: ["It takes courage to show up. What's on your heart?", "Your feelings are valid. What would you tell a friend?", "Hard days happen. What would feel healing right now?"],
}

// ============================================
// HELPERS
// ============================================

function getRitualIcon(iconName: string | null, size = 20, color = '#6b7280') {
  const IconComp = ICON_MAP[iconName || ''] || Heart
  return <IconComp size={size} color={color} />
}

function formatTimerDisplay(seconds: number): string {
  if (seconds < 0) {
    const abs = Math.abs(seconds)
    return `+${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// ============================================
// MAIN SCREEN
// ============================================

export default function RitualsScreen() {
  const {
    memberRituals, loading, refreshing,
    completedCount, totalCount, isCompletedToday,
    refresh, toggleRitual, completeRitual,
    addRitual, createRitual,
    getAvailableRituals, getCategoryProgress, getCategoryFromTime: getCatFromTime,
  } = useRituals()

  // UI State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingToCategory, setAddingToCategory] = useState<RitualCategory | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [selectedRitualToAdd, setSelectedRitualToAdd] = useState<Ritual | null>(null)
  const [selectedTime, setSelectedTime] = useState('08:00')

  // Timer / Focus modal
  const [activeRitual, setActiveRitual] = useState<typeof memberRituals[0] | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [showCompletionFlow, setShowCompletionFlow] = useState(false)
  const [ritualMood, setRitualMood] = useState<string | null>(null)
  const [ritualNotes, setRitualNotes] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Custom ritual form
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customIcon, setCustomIcon] = useState('heart')
  const [customHasDuration, setCustomHasDuration] = useState(false)
  const [customDuration, setCustomDuration] = useState('5')
  const [customTime, setCustomTime] = useState('08:00')

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setTimeout(() => {
        setTimerSeconds(prev => prev - 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timerRunning, timerSeconds])

  const allDone = totalCount > 0 && completedCount === totalCount

  // ============================================
  // ACTIONS
  // ============================================

  function openFocusModal(mr: typeof memberRituals[0]) {
    setActiveRitual(mr)
    setTimerSeconds((mr.ritual.duration_suggestion || 1) * 60)
    setTimerRunning(false)
    setRitualNotes('')
    setRitualMood(null)
    setCurrentPrompt('')
    setShowCompletionFlow(false)
  }

  function closeFocusModal() {
    if (timerRunning) {
      Alert.alert('Timer running', 'Are you sure you want to leave?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => {
          setActiveRitual(null)
          setTimerRunning(false)
          if (timerRef.current) clearTimeout(timerRef.current)
        }},
      ])
    } else {
      setActiveRitual(null)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }

  async function handleCompleteWithDetails() {
    if (!activeRitual) return
    setSaving(true)
    const durationUsed = activeRitual.ritual.duration_suggestion
      ? (activeRitual.ritual.duration_suggestion * 60 - timerSeconds) / 60
      : null
    await completeRitual(activeRitual.ritual_id, {
      mood: ritualMood,
      notes: ritualNotes || null,
      durationMinutes: durationUsed,
    })
    setSaving(false)
    setActiveRitual(null)
    setTimerRunning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  function openAddModal(category: RitualCategory) {
    setAddingToCategory(category)
    setSelectedRitualToAdd(null)
    setSelectedTime(category === 'morning' ? '08:00' : category === 'midday' ? '13:00' : '20:00')
    setShowAddModal(true)
  }

  async function handleAddRitual() {
    if (!selectedRitualToAdd) return
    setSaving(true)
    await addRitual(selectedRitualToAdd.id, selectedTime)
    setSaving(false)
    setShowAddModal(false)
    setSelectedRitualToAdd(null)
  }

  function openCustomModal() {
    setShowAddModal(false)
    setCustomName('')
    setCustomDescription('')
    setCustomIcon('heart')
    setCustomHasDuration(false)
    setCustomDuration('5')
    setCustomTime(addingToCategory === 'morning' ? '08:00' : addingToCategory === 'midday' ? '13:00' : '20:00')
    setShowCustomModal(true)
  }

  async function handleCreateCustom() {
    if (!customName.trim()) return
    setSaving(true)
    const category = getCatFromTime(customTime)
    await createRitual(
      {
        name: customName.trim(),
        description: customDescription.trim() || undefined,
        icon: customIcon,
        category,
        durationSuggestion: customHasDuration ? parseInt(customDuration) || 5 : undefined,
      },
      customTime,
    )
    setSaving(false)
    setShowCustomModal(false)
  }

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  const categories: RitualCategory[] = ['morning', 'midday', 'evening']

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0fdf4' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#059669" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#171717' }}>Rituals</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
              <Info size={18} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
              <Calendar size={16} color="#6b7280" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 }}>
          {completedCount}/{totalCount} completed today
        </Text>

        {/* Daily Rhythm Card */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 18, marginBottom: 24, overflow: 'hidden',
          borderWidth: 1, borderColor: '#e5e7eb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
        }}>
          {/* Card header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>Daily Rhythm</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#9ca3af' }}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />

          {memberRituals.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🌿</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 4 }}>No rituals yet</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
                Tap a category below to add your first ritual
              </Text>
            </View>
          ) : (
            <View>
              {memberRituals.map((mr, idx) => {
                const completed = isCompletedToday(mr.ritual_id)
                const theme = CATEGORY_THEMES[mr.ritual.category] || CATEGORY_THEMES.morning
                const subtitleParts = [
                  mr.planned_time || '',
                  theme.label,
                  mr.ritual.duration_suggestion ? `${mr.ritual.duration_suggestion}m` : '',
                ].filter(Boolean)

                return (
                  <View key={mr.id}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      paddingHorizontal: 20, paddingVertical: 16,
                    }}>
                      {/* Checkbox */}
                      <TouchableOpacity onPress={() => toggleRitual(mr.ritual_id)} style={{
                        width: 30, height: 30, borderRadius: 15, borderWidth: 2,
                        borderColor: completed ? '#059669' : '#d4d4d4',
                        backgroundColor: completed ? '#059669' : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {completed && <Check size={16} color="#fff" />}
                      </TouchableOpacity>

                      {/* Icon */}
                      <View style={{
                        width: 40, height: 40, borderRadius: 12, backgroundColor: theme.lightBg,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {getRitualIcon(mr.ritual.icon, 20, theme.accent)}
                      </View>

                      {/* Name + subtitle */}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16, fontWeight: '600',
                          color: completed ? '#a3a3a3' : '#171717',
                          textDecorationLine: completed ? 'line-through' : 'none',
                        }}>
                          {mr.ritual.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
                          {subtitleParts.join(' \u00B7 ')}
                        </Text>
                      </View>

                      {/* Go button */}
                      {!completed && (
                        <TouchableOpacity onPress={() => openFocusModal(mr)} style={{
                          backgroundColor: '#fef3c7', borderRadius: 20,
                          paddingHorizontal: 16, paddingVertical: 7,
                        }}>
                          <Text style={{ color: '#92400e', fontSize: 14, fontWeight: '700' }}>Go</Text>
                        </TouchableOpacity>
                      )}

                      {/* History icon */}
                      <TouchableOpacity style={{ padding: 4 }}>
                        <History size={20} color="#d4d4d4" />
                      </TouchableOpacity>
                    </View>
                    {idx < memberRituals.length - 1 && (
                      <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 20, marginRight: 20 }} />
                    )}
                  </View>
                )
              })}

              {/* All done celebration */}
              {allDone && (
                <View style={{
                  backgroundColor: '#ecfdf5', padding: 16,
                  alignItems: 'center', marginHorizontal: 16, marginBottom: 16, borderRadius: 12,
                }}>
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>🎉</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#059669' }}>All rituals complete!</Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Well done today</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Category Cards — horizontal row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {categories.map((cat) => {
            const theme = CATEGORY_THEMES[cat]
            const progress = getCategoryProgress(cat)
            const ThemeIcon = theme.icon

            return (
              <TouchableOpacity
                key={cat}
                onPress={() => openAddModal(cat)}
                activeOpacity={0.7}
                style={{
                  flex: 1, backgroundColor: theme.bg, borderRadius: 16, padding: 14,
                  borderWidth: 1, borderColor: `${theme.accent}20`,
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12, backgroundColor: `${theme.accent}18`,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}>
                  <ThemeIcon size={20} color={theme.accent} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717', marginBottom: 2 }}>
                  {theme.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                  {progress.total > 0 ? `${progress.completed}/${progress.total} done` : theme.desc}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* ============================================ */}
      {/* ADD RITUAL MODAL */}
      {/* ============================================ */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setShowAddModal(false)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, maxHeight: '75%',
          }} onPress={() => {}}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>
                {selectedRitualToAdd ? 'Choose time' : 'Add ritual'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setSelectedRitualToAdd(null) }}>
                <X size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {!selectedRitualToAdd ? (
              /* Step 1: Pick a ritual */
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {addingToCategory && getAvailableRituals(addingToCategory).length === 0 ? (
                  <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 }}>
                    All available rituals have been added
                  </Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {addingToCategory && getAvailableRituals(addingToCategory).map((r) => {
                      const theme = CATEGORY_THEMES[r.category]
                      return (
                        <TouchableOpacity key={r.id} onPress={() => setSelectedRitualToAdd(r)} style={{
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          backgroundColor: '#f9fafb', borderRadius: 12, padding: 14,
                        }}>
                          <View style={{
                            width: 40, height: 40, borderRadius: 10, backgroundColor: theme.lightBg,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {getRitualIcon(r.icon, 20, theme.accent)}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '500', color: '#171717' }}>{r.name}</Text>
                            {r.description && (
                              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }} numberOfLines={1}>{r.description}</Text>
                            )}
                          </View>
                          {r.duration_suggestion && (
                            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{r.duration_suggestion}m</Text>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}

                {/* Create custom option */}
                <TouchableOpacity onPress={openCustomModal} style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, paddingVertical: 14, marginTop: 12, borderRadius: 12,
                  borderWidth: 1.5, borderColor: '#059669', borderStyle: 'dashed',
                }}>
                  <Plus size={18} color="#059669" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#059669' }}>Create custom ritual</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* Step 2: Pick a time */
              <View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 20,
                }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: CATEGORY_THEMES[selectedRitualToAdd.category].lightBg, alignItems: 'center', justifyContent: 'center' }}>
                    {getRitualIcon(selectedRitualToAdd.icon, 20, CATEGORY_THEMES[selectedRitualToAdd.category].accent)}
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#171717' }}>{selectedRitualToAdd.name}</Text>
                </View>

                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 }}>Quick presets</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Morning', time: '08:00', icon: Sun },
                    { label: 'Midday', time: '13:00', icon: Coffee },
                    { label: 'Evening', time: '20:00', icon: Moon },
                  ].map(p => (
                    <TouchableOpacity key={p.time} onPress={() => setSelectedTime(p.time)} style={{
                      flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10,
                      backgroundColor: selectedTime === p.time ? '#ecfdf5' : '#f9fafb',
                      borderWidth: 1.5, borderColor: selectedTime === p.time ? '#059669' : '#e5e7eb',
                    }}>
                      <p.icon size={18} color={selectedTime === p.time ? '#059669' : '#9ca3af'} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: selectedTime === p.time ? '#059669' : '#6b7280', marginTop: 4 }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleAddRitual}
                  disabled={saving}
                  style={{
                    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
                    alignItems: 'center', opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    {saving ? 'Adding...' : 'Add to my rituals'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================ */}
      {/* CREATE CUSTOM RITUAL MODAL */}
      {/* ============================================ */}
      <Modal visible={showCustomModal} transparent animationType="slide" onRequestClose={() => setShowCustomModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setShowCustomModal(false)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, maxHeight: '85%',
          }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>Create custom ritual</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <X size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Name</Text>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Morning stretch"
                placeholderTextColor="#d4d4d4"
                style={{
                  backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, fontSize: 15,
                  borderWidth: 1, borderColor: '#e5e7eb', color: '#171717', marginBottom: 16,
                }}
              />

              {/* Icon picker */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Icon</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {AVAILABLE_ICONS.map((iconId) => {
                  const selected = customIcon === iconId
                  return (
                    <TouchableOpacity key={iconId} onPress={() => setCustomIcon(iconId)} style={{
                      width: 44, height: 44, borderRadius: 10,
                      backgroundColor: selected ? '#ecfdf5' : '#f9fafb',
                      borderWidth: 1.5, borderColor: selected ? '#059669' : '#e5e7eb',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {getRitualIcon(iconId, 20, selected ? '#059669' : '#9ca3af')}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Description */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Description (optional)</Text>
              <TextInput
                value={customDescription}
                onChangeText={setCustomDescription}
                placeholder="What does this ritual involve?"
                placeholderTextColor="#d4d4d4"
                multiline
                style={{
                  backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, fontSize: 15,
                  borderWidth: 1, borderColor: '#e5e7eb', color: '#171717', marginBottom: 16,
                  minHeight: 60, textAlignVertical: 'top',
                }}
              />

              {/* Duration toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Has a timer?</Text>
                <TouchableOpacity onPress={() => setCustomHasDuration(!customHasDuration)} style={{
                  width: 48, height: 28, borderRadius: 14,
                  backgroundColor: customHasDuration ? '#059669' : '#d4d4d4',
                  justifyContent: 'center', paddingHorizontal: 2,
                }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
                    alignSelf: customHasDuration ? 'flex-end' : 'flex-start',
                  }} />
                </TouchableOpacity>
              </View>
              {customHasDuration && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TextInput
                    value={customDuration}
                    onChangeText={setCustomDuration}
                    keyboardType="number-pad"
                    style={{
                      backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, fontSize: 15,
                      borderWidth: 1, borderColor: '#e5e7eb', color: '#171717', width: 70, textAlign: 'center',
                    }}
                  />
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>minutes</Text>
                </View>
              )}

              {/* Time presets */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Time</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                {[
                  { label: 'Morning', time: '08:00', icon: Sun },
                  { label: 'Midday', time: '13:00', icon: Coffee },
                  { label: 'Evening', time: '20:00', icon: Moon },
                ].map(p => (
                  <TouchableOpacity key={p.time} onPress={() => setCustomTime(p.time)} style={{
                    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10,
                    backgroundColor: customTime === p.time ? '#ecfdf5' : '#f9fafb',
                    borderWidth: 1.5, borderColor: customTime === p.time ? '#059669' : '#e5e7eb',
                  }}>
                    <p.icon size={18} color={customTime === p.time ? '#059669' : '#9ca3af'} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: customTime === p.time ? '#059669' : '#6b7280', marginTop: 4 }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Create button */}
              <TouchableOpacity
                onPress={handleCreateCustom}
                disabled={saving || !customName.trim()}
                style={{
                  backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
                  alignItems: 'center', opacity: (saving || !customName.trim()) ? 0.5 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  {saving ? 'Creating...' : 'Create ritual'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================ */}
      {/* TIMER / FOCUS MODAL (FULL SCREEN) */}
      {/* ============================================ */}
      <Modal visible={!!activeRitual} animationType="slide" onRequestClose={closeFocusModal}>
        {activeRitual && (() => {
          const theme = CATEGORY_THEMES[activeRitual.ritual.category] || CATEGORY_THEMES.morning
          const totalSec = (activeRitual.ritual.duration_suggestion || 1) * 60
          const progress = timerSeconds >= 0
            ? Math.max(0, 1 - timerSeconds / totalSec)
            : 1
          const isOvertime = timerSeconds < 0
          const radius = 100
          const circumference = 2 * Math.PI * radius
          const strokeDashoffset = circumference * (1 - progress)

          return (
            <LinearGradient colors={theme.gradient as [string, string]} style={{ flex: 1 }}>
              <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                {!showCompletionFlow ? (
                  /* Timer view */
                  <View style={{ flex: 1, paddingHorizontal: 24 }}>
                    {/* Top bar */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
                      <TouchableOpacity onPress={closeFocusModal} style={{
                        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <X size={22} color="#fff" />
                      </TouchableOpacity>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{theme.label}</Text>
                      </View>
                    </View>

                    {/* Ritual info */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
                        {activeRitual.ritual.name}
                      </Text>
                      {activeRitual.ritual.description && (
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
                          {activeRitual.ritual.description}
                        </Text>
                      )}
                    </View>

                    {/* Timer circle */}
                    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <View style={{ position: 'relative', width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
                        <Svg width={240} height={240} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                          {/* Background circle */}
                          <SvgCircle
                            cx={120} cy={120} r={radius}
                            stroke="rgba(255,255,255,0.2)" strokeWidth={8} fill="none"
                          />
                          {/* Progress circle */}
                          <SvgCircle
                            cx={120} cy={120} r={radius}
                            stroke="#fff" strokeWidth={8} fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                          />
                        </Svg>
                        <Text style={{
                          fontSize: 48, fontWeight: '700',
                          color: isOvertime ? '#fecaca' : '#fff',
                        }}>
                          {formatTimerDisplay(timerSeconds)}
                        </Text>
                        {isOvertime && (
                          <Text style={{ color: '#fecaca', fontSize: 13, marginTop: 4 }}>overtime</Text>
                        )}
                      </View>
                    </View>

                    {/* Controls */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                      <TouchableOpacity onPress={() => setTimerSeconds(totalSec)} style={{
                        width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <RotateCcw size={22} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setTimerRunning(!timerRunning)} style={{
                        width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {timerRunning
                          ? <Pause size={30} color={theme.accent} />
                          : <Play size={30} color={theme.accent} style={{ marginLeft: 3 }} />
                        }
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setTimerRunning(false)
                        setShowCompletionFlow(true)
                      }} style={{
                        width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {/* Complete button */}
                    <TouchableOpacity onPress={() => {
                      setTimerRunning(false)
                      setShowCompletionFlow(true)
                    }} style={{
                      backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14,
                      paddingVertical: 16, alignItems: 'center', marginBottom: 12,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Complete ritual</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Completion flow */
                  <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}>
                    {/* Back button */}
                    <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 24 }}>
                      <TouchableOpacity onPress={() => setShowCompletionFlow(false)} style={{
                        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <X size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                      How did it go?
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, textAlign: 'center', marginBottom: 32 }}>
                      {activeRitual.ritual.name}
                    </Text>

                    {/* Mood selection */}
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12 }}>How are you feeling?</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                      {MOOD_OPTIONS.map((mood) => {
                        const selected = ritualMood === mood.value
                        const MoodIcon = mood.icon
                        return (
                          <TouchableOpacity key={mood.value} onPress={() => {
                            setRitualMood(mood.value)
                            const prompts = MOOD_PROMPTS[mood.value] || []
                            setCurrentPrompt(prompts[Math.floor(Math.random() * prompts.length)] || '')
                          }} style={{
                            flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
                            backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.15)',
                          }}>
                            <MoodIcon size={22} color={selected ? mood.color : '#fff'} />
                            <Text style={{
                              fontSize: 11, fontWeight: '500', marginTop: 4,
                              color: selected ? mood.color : 'rgba(255,255,255,0.8)',
                            }}>
                              {mood.label}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>

                    {/* Mood prompt */}
                    {currentPrompt ? (
                      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 }}>
                        {currentPrompt}
                      </Text>
                    ) : null}

                    {/* Notes */}
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 8 }}>Notes (optional)</Text>
                    <TextInput
                      value={ritualNotes}
                      onChangeText={setRitualNotes}
                      placeholder="Any reflections..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      multiline
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
                        padding: 14, fontSize: 15, color: '#fff', minHeight: 80,
                        textAlignVertical: 'top', marginBottom: 32,
                      }}
                    />

                    {/* Complete button */}
                    <TouchableOpacity
                      onPress={handleCompleteWithDetails}
                      disabled={saving}
                      style={{
                        backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16,
                        alignItems: 'center', opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: theme.accent, fontSize: 17, fontWeight: '700' }}>
                        {saving ? 'Saving...' : 'Complete'}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </SafeAreaView>
            </LinearGradient>
          )
        })()}
      </Modal>
    </SafeAreaView>
  )
}
