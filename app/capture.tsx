import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import {
  useAudioRecorder,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio'
import {
  X,
  Camera,
  Video,
  Mic,
  FileText,
  Sparkles,
  Trash2,
  Upload,
  Square,
  Check,
  Send,
  MicOff,
  ChevronLeft,
  Play,
} from 'lucide-react-native'
import { createMoment, type MediaItem } from '@/lib/services/moments'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const MAX_ITEMS = 7

type CaptureType = 'photo' | 'video' | 'voice' | 'write'

// Step indices for the pager
const STEP_SELECT = 0
const STEP_CAPTURE = 1
const STEP_PREVIEW = 2
const STEP_DETAILS = 3

const STEP_LABELS = ['Type', 'Capture', 'Preview', 'Details']

// ============================================
// MOOD TAGS — same as Next.js
// ============================================
const moodTags = [
  { id: 'grateful', emoji: '\u{1F64F}', label: 'Grateful' },
  { id: 'peaceful', emoji: '\u{1F33F}', label: 'Peaceful' },
  { id: 'joyful', emoji: '\u2728', label: 'Joyful' },
  { id: 'inspired', emoji: '\u{1F4A1}', label: 'Inspired' },
  { id: 'loved', emoji: '\u{1F495}', label: 'Loved' },
  { id: 'calm', emoji: '\u{1F9D8}', label: 'Calm' },
  { id: 'hopeful', emoji: '\u{1F31F}', label: 'Hopeful' },
  { id: 'proud', emoji: '\u{1F3C6}', label: 'Proud' },
  { id: 'overwhelmed', emoji: '\u{1F30A}', label: 'Overwhelmed' },
  { id: 'tired', emoji: '\u{1F319}', label: 'Tired' },
  { id: 'uncertain', emoji: '\u{1F32B}\uFE0F', label: 'Uncertain' },
  { id: 'tender', emoji: '\u{1F940}', label: 'Tender' },
  { id: 'restless', emoji: '\u{1F4AD}', label: 'Restless' },
  { id: 'heavy', emoji: '\u{1F327}\uFE0F', label: 'Heavy' },
]

// ============================================
// CAPTURE TYPE OPTIONS
// ============================================
const captureTypes: {
  id: CaptureType
  label: string
  desc: string
  colors: [string, string]
}[] = [
  {
    id: 'photo',
    label: 'Photo',
    desc: 'Take or upload a photo',
    colors: ['#fb7185', '#ec4899'],
  },
  {
    id: 'video',
    label: 'Video',
    desc: 'Record or upload a video',
    colors: ['#a78bfa', '#8b5cf6'],
  },
  {
    id: 'voice',
    label: 'Voice',
    desc: 'Record a voice note',
    colors: ['#fbbf24', '#f97316'],
  },
  {
    id: 'write',
    label: 'Write',
    desc: 'Write your thoughts',
    colors: ['#34d399', '#14b8a6'],
  },
]

function getTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'photo'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'voice'
  return 'write'
}

function getTypeColors(mimeType: string): [string, string] {
  const type = getTypeIcon(mimeType)
  return captureTypes.find(t => t.id === type)?.colors || ['#a3a3a3', '#737373']
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CaptureScreen() {
  const router = useRouter()
  const pagerRef = useRef<ScrollView>(null)

  // Current step tracked by scroll position
  const [currentStep, setCurrentStep] = useState(0)
  // Max step the user has reached (controls how far they can swipe forward)
  const [maxReachedStep, setMaxReachedStep] = useState(0)

  // State
  const [captureType, setCaptureType] = useState<CaptureType | null>(null)

  // Multi-media captured items
  const [capturedItems, setCapturedItems] = useState<MediaItem[]>([])
  const [writtenText, setWrittenText] = useState('')

  // Details
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)

  // Audio recording (expo-audio hooks)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track the duration of the current recording for the audio item
  const currentRecordingTimeRef = useRef(0)

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (playerRef.current) playerRef.current.release()
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const atItemLimit = capturedItems.length >= MAX_ITEMS

  // ============================================
  // PAGER NAVIGATION
  // ============================================
  const goToStep = useCallback((step: number) => {
    pagerRef.current?.scrollTo({ x: step * SCREEN_WIDTH, animated: true })
    setCurrentStep(step)
    if (step > maxReachedStep) setMaxReachedStep(step)
  }, [maxReachedStep])

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    // Don't allow swiping past the max reached step
    if (page > maxReachedStep) {
      pagerRef.current?.scrollTo({ x: maxReachedStep * SCREEN_WIDTH, animated: true })
      setCurrentStep(maxReachedStep)
    } else {
      setCurrentStep(page)
    }
  }, [maxReachedStep])

  // ============================================
  // TYPE SELECTION
  // ============================================
  const handleTypeSelect = (type: CaptureType) => {
    setCaptureType(type)
    // For 'write' type, skip capture and go directly to write in capture step
    const nextStep = STEP_CAPTURE
    setMaxReachedStep(prev => Math.max(prev, nextStep))
    goToStep(nextStep)
  }

  // ============================================
  // ADD ITEM HELPER
  // ============================================
  const addMediaItem = (item: MediaItem) => {
    setCapturedItems(prev => [...prev, item])
    const nextStep = STEP_PREVIEW
    setMaxReachedStep(prev => Math.max(prev, nextStep))
    goToStep(nextStep)
  }

  const removeMediaItem = (index: number) => {
    setCapturedItems(prev => prev.filter((_, i) => i !== index))
  }

  // ============================================
  // PHOTO HANDLING
  // ============================================
  const pickPhoto = async (useCamera: boolean) => {
    const permResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to continue.')
      return
    }

    const fn = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync

    const result = await fn({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      addMediaItem({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
      })
    }
  }

  // ============================================
  // VIDEO HANDLING
  // ============================================
  const pickVideo = async (useCamera: boolean) => {
    const permResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to continue.')
      return
    }

    const fn = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync

    const result = await fn({
      mediaTypes: ['videos'],
      videoMaxDuration: 120,
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      if (asset.fileSize && asset.fileSize > 30 * 1024 * 1024) {
        Alert.alert('Too large', 'Video must be under 30MB.')
        return
      }
      addMediaItem({
        uri: asset.uri,
        mimeType: asset.mimeType || 'video/mp4',
      })
    }
  }

  // ============================================
  // QUICK-ADD from preview — triggers capture directly, stays on preview
  // ============================================
  const quickAddPhoto = () => {
    if (atItemLimit) return
    if (Platform.OS === 'web') {
      pickPhoto(false)
    } else {
      Alert.alert('Add Photo', 'Choose a source', [
        { text: 'Camera', onPress: () => pickPhoto(true) },
        { text: 'Gallery', onPress: () => pickPhoto(false) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  const quickAddVideo = () => {
    if (atItemLimit) return
    if (Platform.OS === 'web') {
      pickVideo(false)
    } else {
      Alert.alert('Add Video', 'Choose a source', [
        { text: 'Record', onPress: () => pickVideo(true) },
        { text: 'Gallery', onPress: () => pickVideo(false) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  const quickAddVoice = () => {
    if (atItemLimit) return
    setCaptureType('voice')
    goToStep(STEP_CAPTURE)
  }

  // ============================================
  // VOICE RECORDING (expo-audio)
  // ============================================
  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow microphone access.')
        return
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      })

      recorder.record()
      setIsRecording(true)
      setRecordingTime(0)
      currentRecordingTimeRef.current = 0

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1
          currentRecordingTimeRef.current = next
          return next
        })
      }, 1000)
    } catch (err) {
      console.error('Error starting recording:', err)
      Alert.alert('Error', 'Could not start recording.')
    }
  }

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setIsRecording(false)

    try {
      await recorder.stop()
      const uri = recorder.uri

      if (uri) {
        addMediaItem({
          uri,
          mimeType: 'audio/m4a',
          durationSeconds: currentRecordingTimeRef.current,
        })
      }
    } catch (err) {
      console.error('Error stopping recording:', err)
    }
  }

  const playAudioPreview = async (uri: string) => {
    if (playerRef.current) playerRef.current.release()

    const player = createAudioPlayer(uri)
    playerRef.current = player
    player.play()
  }

  // ============================================
  // MOOD TOGGLE
  // ============================================
  const toggleMood = (id: string) => {
    setSelectedMoods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  // ============================================
  // SAVE
  // ============================================
  const handleSave = async () => {
    setSaving(true)

    try {
      const result = await createMoment({
        mediaItems: capturedItems,
        textContent: writtenText || undefined,
        caption: caption || undefined,
        moods: selectedMoods,
      })

      if (result) {
        if (router.canDismiss()) {
          router.dismiss()
        } else {
          router.replace('/(tabs)')
        }
      } else {
        Alert.alert('Error', 'Could not save moment. Please try again.')
      }
    } catch (err) {
      console.error('Error saving moment:', err)
      Alert.alert('Error', 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // RESET
  // ============================================
  const resetCapture = () => {
    setCapturedItems([])
    setWrittenText('')
    setSelectedMoods([])
    setCaption('')
    setRecordingTime(0)
    setCaptureType(null)
    setMaxReachedStep(0)
    goToStep(STEP_SELECT)
  }

  const currentType = captureTypes.find(t => t.id === captureType)

  const hasContent = capturedItems.length > 0 || writtenText.trim().length > 0

  // ============================================
  // STEP INDICATOR
  // ============================================
  const StepIndicator = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 }}>
      {STEP_LABELS.map((label, i) => {
        const isActive = currentStep === i
        const isReached = i <= maxReachedStep
        return (
          <TouchableOpacity
            key={label}
            onPress={() => isReached ? goToStep(i) : null}
            activeOpacity={isReached ? 0.7 : 1}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            {i > 0 && (
              <View style={{
                width: 20, height: 1,
                backgroundColor: i <= maxReachedStep ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
              }} />
            )}
            <View style={{
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
              backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
            }}>
              <Text style={{
                fontSize: 11, fontWeight: isActive ? '700' : '500',
                color: isActive ? '#ffffff' : isReached ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
              }}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  // ============================================
  // PREVIEW STRIP — shows all captured items
  // ============================================
  const PreviewStrip = () => (
    <View style={{ flex: 1 }}>
      {/* Counter */}
      <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
        <View style={{
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.12)',
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>
            {capturedItems.length}/{MAX_ITEMS} items
          </Text>
        </View>
      </View>

      {/* Items strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24, gap: 12,
          alignItems: 'center',
          flexGrow: 1,
        }}
        style={{ maxHeight: 240 }}
      >
        {capturedItems.map((item, idx) => {
          const typeIcon = getTypeIcon(item.mimeType)
          const colors = getTypeColors(item.mimeType)

          return (
            <View key={`${item.uri}-${idx}`} style={{ position: 'relative' }}>
              {typeIcon === 'photo' ? (
                <Image
                  source={{ uri: item.uri }}
                  style={{
                    width: 140, height: 180, borderRadius: 16,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={colors}
                  style={{
                    width: 140, height: 180, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {typeIcon === 'video' && <Video size={36} color="#fff" />}
                  {typeIcon === 'voice' && (
                    <TouchableOpacity onPress={() => playAudioPreview(item.uri)}>
                      <View style={{ alignItems: 'center', gap: 8 }}>
                        <Mic size={36} color="#fff" />
                        {item.durationSeconds != null && (
                          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                            {formatTime(item.durationSeconds)}
                          </Text>
                        )}
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                          backgroundColor: 'rgba(255,255,255,0.2)',
                        }}>
                          <Play size={12} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 11 }}>Play</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              )}

              {/* Delete button */}
              <TouchableOpacity
                onPress={() => removeMediaItem(idx)}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} color="#fff" />
              </TouchableOpacity>

              {/* Sort order badge */}
              <View style={{
                position: 'absolute', bottom: 6, left: 6,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                  {idx + 1}
                </Text>
              </View>
            </View>
          )
        })}
      </ScrollView>

      {/* Written text preview */}
      {writtenText.trim() ? (
        <View style={{
          marginHorizontal: 24, marginTop: 12, padding: 14,
          backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 }} numberOfLines={3}>
            {writtenText}
          </Text>
        </View>
      ) : null}

      {/* Quick-add bar + Continue */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 48, gap: 14 }}>
        {/* Quick-add type icons */}
        {!atItemLimit && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginRight: 4 }}>Add</Text>
            {([
              { type: 'photo' as const, icon: Camera, colors: ['#fb7185', '#ec4899'] as [string, string], onPress: quickAddPhoto },
              { type: 'video' as const, icon: Video, colors: ['#a78bfa', '#8b5cf6'] as [string, string], onPress: quickAddVideo },
              { type: 'voice' as const, icon: Mic, colors: ['#fbbf24', '#f97316'] as [string, string], onPress: quickAddVoice },
            ]).map(({ type, icon: Icon, colors, onPress }) => (
              <TouchableOpacity
                key={type}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={colors}
                  style={{
                    width: 44, height: 44, borderRadius: 14,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {atItemLimit && (
          <Text style={{ color: '#f97316', textAlign: 'center', fontSize: 13 }}>
            Maximum {MAX_ITEMS} items reached
          </Text>
        )}

        {/* Bottom row: trash + continue */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <TouchableOpacity
            onPress={resetCapture}
            style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Trash2 size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const nextStep = STEP_DETAILS
              setMaxReachedStep(prev => Math.max(prev, nextStep))
              goToStep(nextStep)
            }}
            activeOpacity={0.8}
            style={{ flex: 1, maxWidth: 240 }}
          >
            <LinearGradient
              colors={['#34d399', '#14b8a6']}
              style={{
                height: 48, borderRadius: 24,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Sparkles size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  // ============================================
  // RENDER
  // ============================================
  return (
    <LinearGradient
      colors={['#111827', '#1f2937', '#111827']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity
            onPress={() => {
              if (currentStep === STEP_SELECT) {
                router.canDismiss() ? router.dismiss() : router.replace('/(tabs)')
              } else if (currentStep === STEP_CAPTURE && capturedItems.length > 0) {
                // If we have items, go back to preview instead of type select
                goToStep(STEP_PREVIEW)
              } else {
                goToStep(currentStep - 1)
              }
            }}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {currentStep === STEP_SELECT
              ? <X size={20} color="#ffffff" />
              : <ChevronLeft size={20} color="#ffffff" />
            }
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '500' }}>
              {currentStep === STEP_SELECT
                ? 'New Moment'
                : currentType?.label || ''}
            </Text>
            {capturedItems.length > 0 && (
              <View style={{
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: 'rgba(16,185,129,0.3)',
              }}>
                <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '700' }}>
                  {capturedItems.length}/{MAX_ITEMS}
                </Text>
              </View>
            )}
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Swipeable Pager */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ====== PAGE 0: SELECT TYPE ====== */}
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <View style={{ flex: 1, padding: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 32, fontSize: 15 }}>
                How would you like to capture this moment?
              </Text>

              <View style={{ gap: 14, width: '100%', maxWidth: 340, alignSelf: 'center' }}>
                {/* Row 1 */}
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  {captureTypes.slice(0, 2).map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => handleTypeSelect(type.id)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: captureType === type.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                        borderRadius: 24,
                        padding: 20,
                        alignItems: 'center',
                        gap: 10,
                        borderWidth: captureType === type.id ? 2 : 1,
                        borderColor: captureType === type.id ? type.colors[0] : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <LinearGradient
                        colors={type.colors}
                        style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {type.id === 'photo' && <Camera size={28} color="#fff" />}
                        {type.id === 'video' && <Video size={28} color="#fff" />}
                      </LinearGradient>
                      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>{type.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>{type.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Row 2 */}
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  {captureTypes.slice(2, 4).map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => handleTypeSelect(type.id)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: captureType === type.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                        borderRadius: 24,
                        padding: 20,
                        alignItems: 'center',
                        gap: 10,
                        borderWidth: captureType === type.id ? 2 : 1,
                        borderColor: captureType === type.id ? type.colors[0] : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <LinearGradient
                        colors={type.colors}
                        style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {type.id === 'voice' && <Mic size={28} color="#fff" />}
                        {type.id === 'write' && <FileText size={28} color="#fff" />}
                      </LinearGradient>
                      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>{type.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>{type.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* ====== PAGE 1: CAPTURE ====== */}
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {/* PHOTO */}
            {captureType === 'photo' && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <TouchableOpacity
                  onPress={() => pickPhoto(true)}
                  activeOpacity={0.8}
                  style={{
                    width: SCREEN_WIDTH - 48, aspectRatio: 1,
                    maxWidth: 320,
                    borderRadius: 24,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: 'rgba(56,189,248,0.3)',
                    backgroundColor: 'rgba(56,189,248,0.1)',
                  }}
                >
                  <LinearGradient
                    colors={['#38bdf8', '#3b82f6']}
                    style={{
                      width: 96, height: 96, borderRadius: 48,
                      alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Camera size={48} color="#fff" />
                  </LinearGradient>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 }}>
                    Tap to take a photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => pickPhoto(false)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    marginTop: 24, paddingHorizontal: 20, paddingVertical: 12,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 999,
                  }}
                >
                  <Upload size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' }}>
                    Choose from gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* VIDEO */}
            {captureType === 'video' && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <TouchableOpacity
                  onPress={() => pickVideo(true)}
                  activeOpacity={0.8}
                  style={{
                    width: SCREEN_WIDTH - 48, aspectRatio: 16 / 9,
                    maxWidth: 320,
                    borderRadius: 24,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: 'rgba(56,189,248,0.3)',
                    backgroundColor: 'rgba(56,189,248,0.1)',
                  }}
                >
                  <LinearGradient
                    colors={['#38bdf8', '#3b82f6']}
                    style={{
                      width: 96, height: 96, borderRadius: 48,
                      alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Video size={48} color="#fff" />
                  </LinearGradient>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 }}>
                    Tap to record a video
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => pickVideo(false)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    marginTop: 24, paddingHorizontal: 20, paddingVertical: 12,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 999,
                  }}
                >
                  <Upload size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' }}>
                    Choose from gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* VOICE */}
            {captureType === 'voice' && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                {/* Pulsing circles */}
                <View style={{ width: 192, height: 192, alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                  {isRecording && (
                    <>
                      <View style={{
                        position: 'absolute', width: 192, height: 192, borderRadius: 96,
                        backgroundColor: 'rgba(249,115,22,0.15)',
                      }} />
                      <View style={{
                        position: 'absolute', width: 160, height: 160, borderRadius: 80,
                        backgroundColor: 'rgba(249,115,22,0.25)',
                      }} />
                    </>
                  )}
                  <LinearGradient
                    colors={isRecording ? ['#ef4444', '#f97316'] : ['#fbbf24', '#f97316']}
                    style={{
                      width: 128, height: 128, borderRadius: 64,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isRecording
                      ? <MicOff size={48} color="#fff" />
                      : <Mic size={48} color="#fff" />
                    }
                  </LinearGradient>
                </View>

                {/* Timer */}
                <Text style={{ color: '#ffffff', fontSize: 40, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 32 }}>
                  {formatTime(recordingTime)}
                </Text>

                {/* Record / Stop button */}
                {!isRecording ? (
                  <TouchableOpacity
                    onPress={startRecording}
                    activeOpacity={0.8}
                    style={{ marginBottom: 24 }}
                  >
                    <LinearGradient
                      colors={['#fbbf24', '#f97316']}
                      style={{
                        width: 80, height: 80, borderRadius: 40,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Mic size={32} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={stopRecording}
                    activeOpacity={0.8}
                    style={{ marginBottom: 24 }}
                  >
                    <LinearGradient
                      colors={['#ef4444', '#dc2626']}
                      style={{
                        width: 80, height: 80, borderRadius: 40,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Square size={32} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  {isRecording ? 'Tap to stop' : 'Tap to record'}
                </Text>
              </View>
            )}

            {/* WRITE */}
            {captureType === 'write' && (
              <View style={{ flex: 1, padding: 24 }}>
                <View style={{ flex: 1, maxWidth: 480, alignSelf: 'center', width: '100%' }}>
                  <TextInput
                    value={writtenText}
                    onChangeText={setWrittenText}
                    placeholder="Write your thoughts, feelings, or whatever you want to capture..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    autoFocus
                    style={{
                      flex: 1,
                      padding: 24,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      fontSize: 16,
                      lineHeight: 24,
                      textAlignVertical: 'top',
                    }}
                  />

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                      {writtenText.length} characters
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        const nextStep = capturedItems.length > 0 ? STEP_PREVIEW : STEP_DETAILS
                        setMaxReachedStep(prev => Math.max(prev, nextStep))
                        goToStep(nextStep)
                      }}
                      disabled={!writtenText.trim()}
                      activeOpacity={0.8}
                      style={{ opacity: writtenText.trim() ? 1 : 0.4 }}
                    >
                      <LinearGradient
                        colors={['#10b981', '#14b8a6']}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999,
                        }}
                      >
                        <Check size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Continue</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Placeholder when no type selected yet */}
            {!captureType && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>
                  Swipe back to choose a type
                </Text>
              </View>
            )}
          </View>

          {/* ====== PAGE 2: PREVIEW ====== */}
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {hasContent ? (
              <PreviewStrip />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>
                  Swipe back to capture something
                </Text>
              </View>
            )}
          </View>

          {/* ====== PAGE 3: DETAILS ====== */}
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <View style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: 8,
            }}>
              {/* Drag handle */}
              <View style={{
                width: 48, height: 4, borderRadius: 2,
                backgroundColor: '#d1d5db',
                alignSelf: 'center', marginBottom: 24,
              }} />

              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {/* Media thumbnails strip */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, marginBottom: 24 }}
                >
                  {capturedItems.map((item, idx) => {
                    const typeIcon = getTypeIcon(item.mimeType)
                    const colors = getTypeColors(item.mimeType)

                    return typeIcon === 'photo' ? (
                      <Image
                        key={`${item.uri}-${idx}`}
                        source={{ uri: item.uri }}
                        style={{ width: 64, height: 64, borderRadius: 14 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        key={`${item.uri}-${idx}`}
                        colors={colors}
                        style={{ width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {typeIcon === 'video' && <Video size={24} color="#fff" />}
                        {typeIcon === 'voice' && <Mic size={24} color="#fff" />}
                      </LinearGradient>
                    )
                  })}

                  {/* Write indicator if text exists */}
                  {writtenText.trim() ? (
                    <LinearGradient
                      colors={['#34d399', '#14b8a6']}
                      style={{ width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FileText size={24} color="#fff" />
                    </LinearGradient>
                  ) : null}
                </ScrollView>

                {/* Summary text */}
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                  {capturedItems.length > 0 && writtenText.trim()
                    ? `${capturedItems.length} media item${capturedItems.length !== 1 ? 's' : ''} + text`
                    : capturedItems.length > 0
                      ? `${capturedItems.length} media item${capturedItems.length !== 1 ? 's' : ''}`
                      : 'Written moment'}
                </Text>

                {/* Written text preview */}
                {writtenText.trim() ? (
                  <View style={{
                    marginBottom: 24, padding: 16,
                    backgroundColor: '#f9fafb', borderRadius: 16,
                  }}>
                    <Text style={{ color: '#374151', fontSize: 14, lineHeight: 20 }} numberOfLines={4}>
                      {writtenText}
                    </Text>
                  </View>
                ) : null}

                {/* Mood tags */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12 }}>
                    How are you feeling?
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {moodTags.map((mood) => {
                      const selected = selectedMoods.includes(mood.id)
                      return (
                        <TouchableOpacity
                          key={mood.id}
                          onPress={() => toggleMood(mood.id)}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            paddingHorizontal: 16, paddingVertical: 10,
                            borderRadius: 999,
                            backgroundColor: selected ? '#d1fae5' : '#f3f4f6',
                            borderWidth: selected ? 2 : 0,
                            borderColor: selected ? '#10b981' : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>{mood.emoji}</Text>
                          <Text style={{
                            fontSize: 13, fontWeight: '500',
                            color: selected ? '#047857' : '#4b5563',
                          }}>
                            {mood.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {/* Caption */}
                <View style={{ marginBottom: 32 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                    Add a note (optional)
                  </Text>
                  <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Describe this moment..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    style={{
                      padding: 16, backgroundColor: '#f9fafb',
                      borderRadius: 16, color: '#111827',
                      fontSize: 14, lineHeight: 20,
                      minHeight: 80, textAlignVertical: 'top',
                    }}
                  />
                </View>

                {/* Save button */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving || selectedMoods.length === 0}
                  activeOpacity={0.8}
                  style={{ opacity: (saving || selectedMoods.length === 0) ? 0.5 : 1 }}
                >
                  <LinearGradient
                    colors={['#10b981', '#14b8a6']}
                    style={{
                      height: 56, borderRadius: 16,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Send size={20} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 17 }}>Save Moment</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {selectedMoods.length === 0 && (
                  <Text style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 12 }}>
                    Select at least one mood
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  )
}
