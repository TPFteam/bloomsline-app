import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import {
  useAudioRecorder,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio'
import {
  Lightbulb,
  Wind,
  Feather,
  Heart,
  ArrowLeft,
  ImageIcon,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  X,
  Send,
  Frown,
  Annoyed,
  Meh,
  Smile,
  Laugh,
  Trash2,
  Clock,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ============================================
// CONSTANTS
// ============================================

const intents = [
  {
    id: 'discovery' as const,
    label: 'Discovery',
    desc: 'I found something',
    Icon: Lightbulb,
    colors: ['#f59e0b', '#ea580c'] as [string, string],
    placeholder: 'I realized that...',
  },
  {
    id: 'vent' as const,
    label: 'Vent',
    desc: 'I need to let go',
    Icon: Wind,
    colors: ['#8b5cf6', '#6366f1'] as [string, string],
    placeholder: 'Let it out...',
  },
  {
    id: 'reflect' as const,
    label: 'Reflect',
    desc: 'Just reflecting',
    Icon: Feather,
    colors: ['#14b8a6', '#059669'] as [string, string],
    placeholder: 'I\'ve been thinking about...',
  },
  {
    id: 'gratitude' as const,
    label: 'Gratitude',
    desc: 'Feeling grateful',
    Icon: Heart,
    colors: ['#f43f5e', '#ec4899'] as [string, string],
    placeholder: 'I\'m grateful for...',
  },
]

type IntentType = typeof intents[number]['id']

const moods = [
  { value: 0, Icon: Frown, label: 'Sad', color: '#3b82f6', bg: '#dbeafe' },
  { value: 1, Icon: Annoyed, label: 'Down', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 2, Icon: Meh, label: 'Okay', color: '#6b7280', bg: '#f3f4f6' },
  { value: 3, Icon: Smile, label: 'Good', color: '#f59e0b', bg: '#fef3c7' },
  { value: 4, Icon: Laugh, label: 'Great', color: '#059669', bg: '#d1fae5' },
]

interface Reflection {
  id: string
  intent: string
  content: string
  image_url?: string | null
  audio_url?: string | null
  mood?: number | null
  created_at: string
}

// ============================================
// HELPERS
// ============================================

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - dateDay.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (days === 0) return `Today ${time}`
  if (days === 1) return `Yesterday ${time}`
  if (days < 7) return `${d.toLocaleDateString([], { weekday: 'long' })} ${time}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function getGreeting(): { text: string; Icon: typeof Lightbulb } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', Icon: Lightbulb }
  if (h < 17) return { text: 'Good afternoon', Icon: Feather }
  return { text: 'Good evening', Icon: Heart }
}

// ============================================
// MAIN SCREEN
// ============================================

export default function ReflectScreen() {
  const { user, member } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reflections, setReflections] = useState<Reflection[]>([])

  // Canvas state
  const [selectedIntent, setSelectedIntent] = useState<IntentType | null>(null)
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Image
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState<string | null>(null)

  // Audio
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (playerRef.current) playerRef.current.release()
    }
  }, [])

  // ============================================
  // DATA
  // ============================================

  const fetchReflections = useCallback(async () => {
    if (!member?.id) return
    try {
      const { data, error } = await supabase
        .from('member_reflections')
        .select('id, intent, content, image_url, audio_url, mood, created_at')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setReflections((data || []) as Reflection[])
    } catch (err) {
      console.error('Error fetching reflections:', err)
    } finally {
      setLoading(false)
    }
  }, [member?.id])

  useEffect(() => { fetchReflections() }, [fetchReflections])

  async function onRefresh() {
    setRefreshing(true)
    await fetchReflections()
    setRefreshing(false)
  }

  // ============================================
  // IMAGE
  // ============================================

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
      setImageMime(result.assets[0].mimeType || 'image/jpeg')
    }
  }

  // ============================================
  // AUDIO
  // ============================================

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  async function startRecording() {
    try {
      const perm = await requestRecordingPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow microphone access.')
        return
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      recorder.record()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (err) {
      console.error('Error starting recording:', err)
    }
  }

  async function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)

    try {
      await recorder.stop()
      if (recorder.uri) setAudioUri(recorder.uri)
    } catch (err) {
      console.error('Error stopping recording:', err)
    }
  }

  function playAudio() {
    if (!audioUri) return
    if (playerRef.current) playerRef.current.release()

    const player = createAudioPlayer(audioUri)
    playerRef.current = player
    setIsPlaying(true)
    player.play()

    // Simple timeout to reset playing state
    setTimeout(() => setIsPlaying(false), (recordingTime + 1) * 1000)
  }

  // ============================================
  // SAVE
  // ============================================

  async function handleSave() {
    if (!member?.id || !selectedIntent) return
    if (!content.trim() && !imageUri && !audioUri) {
      if (Platform.OS === 'web') alert('Add some content to your reflection.')
      else Alert.alert('Empty reflection', 'Add some text, a photo, or a voice note.')
      return
    }

    setSaving(true)
    try {
      let uploadedImageUrl: string | null = null
      let uploadedAudioUrl: string | null = null

      // Upload image
      if (imageUri) {
        const ts = Date.now()
        const ext = (imageMime || 'image/jpeg').split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
        const filePath = `${member.id}/${ts}.${ext}`

        let fileBody: ArrayBuffer | Blob
        if (Platform.OS === 'web') {
          const resp = await fetch(imageUri)
          fileBody = await resp.blob()
        } else {
          const FileSystem = require('expo-file-system')
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          })
          const bin = atob(base64)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          fileBody = bytes.buffer as ArrayBuffer
        }

        const { error: upErr } = await supabase.storage
          .from('reflections')
          .upload(filePath, fileBody, { contentType: imageMime || 'image/jpeg', upsert: true })

        if (!upErr) {
          const { data: urlData } = supabase.storage.from('reflections').getPublicUrl(filePath)
          uploadedImageUrl = urlData.publicUrl
        }
      }

      // Upload audio
      if (audioUri) {
        const ts = Date.now()
        const filePath = `${member.id}/${ts}.m4a`

        let fileBody: ArrayBuffer | Blob
        if (Platform.OS === 'web') {
          const resp = await fetch(audioUri)
          fileBody = await resp.blob()
        } else {
          const FileSystem = require('expo-file-system')
          const base64 = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64,
          })
          const bin = atob(base64)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          fileBody = bytes.buffer as ArrayBuffer
        }

        const { error: upErr } = await supabase.storage
          .from('reflections')
          .upload(filePath, fileBody, { contentType: 'audio/m4a', upsert: true })

        if (!upErr) {
          const { data: urlData } = supabase.storage.from('reflections').getPublicUrl(filePath)
          uploadedAudioUrl = urlData.publicUrl
        }
      }

      // Insert reflection
      const { error } = await supabase.from('member_reflections').insert({
        member_id: member.id,
        intent: selectedIntent,
        content: content.trim(),
        image_url: uploadedImageUrl,
        audio_url: uploadedAudioUrl,
        mood: selectedMood,
        gratitude: selectedIntent === 'gratitude' ? content.trim() : null,
        thoughts: content.trim(),
      })

      if (error) throw error

      // Reset & refresh
      resetCanvas()
      await fetchReflections()

      if (Platform.OS === 'web') alert('Reflection saved!')
      else Alert.alert('Saved', 'Your reflection has been saved.')
    } catch (err) {
      console.error('Error saving reflection:', err)
      if (Platform.OS === 'web') alert('Failed to save reflection.')
      else Alert.alert('Error', 'Could not save your reflection.')
    } finally {
      setSaving(false)
    }
  }

  function resetCanvas() {
    setSelectedIntent(null)
    setContent('')
    setSelectedMood(null)
    setImageUri(null)
    setImageMime(null)
    setAudioUri(null)
    setRecordingTime(0)
    setIsPlaying(false)
    if (playerRef.current) {
      playerRef.current.release()
      playerRef.current = null
    }
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </SafeAreaView>
    )
  }

  const greeting = getGreeting()
  const currentIntent = intents.find(i => i.id === selectedIntent)

  // ============================================
  // RENDER — CANVAS (intent selected)
  // ============================================

  if (selectedIntent && currentIntent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', padding: 16,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff',
        }}>
          <TouchableOpacity onPress={resetCanvas} style={{ padding: 4, marginRight: 12 }}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1,
          }}>
            <LinearGradient
              colors={currentIntent.colors}
              style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              <currentIntent.Icon size={16} color="#fff" />
            </LinearGradient>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717' }}>{currentIntent.label}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Text input */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={currentIntent.placeholder}
            placeholderTextColor="#d1d5db"
            multiline
            autoFocus
            style={{
              fontSize: 16, color: '#171717', lineHeight: 26,
              padding: 20, backgroundColor: '#fff', borderRadius: 20,
              borderWidth: 1, borderColor: '#f3f4f6',
              minHeight: 160, textAlignVertical: 'top',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
            }}
          />

          {/* Image preview */}
          {imageUri && (
            <View style={{ marginTop: 16, position: 'relative' }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 200, borderRadius: 16, backgroundColor: '#f3f4f6' }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => { setImageUri(null); setImageMime(null) }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Audio preview */}
          {audioUri && !isRecording && (
            <View style={{
              marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: '#fff', borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: '#f3f4f6',
            }}>
              <TouchableOpacity onPress={playAudio} style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
              }}>
                {isPlaying ? <Pause size={20} color="#059669" /> : <Play size={20} color="#059669" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>Voice note</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>{formatTime(recordingTime)}</Text>
              </View>
              <TouchableOpacity onPress={() => { setAudioUri(null); setRecordingTime(0) }} style={{ padding: 8 }}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Recording UI */}
          {isRecording && (
            <View style={{
              marginTop: 16, alignItems: 'center', gap: 12,
              backgroundColor: '#fef2f2', borderRadius: 16, padding: 20,
              borderWidth: 1, borderColor: '#fecaca',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>Recording</Text>
              </View>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#171717', fontVariant: ['tabular-nums'] }}>
                {formatTime(recordingTime)}
              </Text>
              <TouchableOpacity onPress={stopRecording} style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
              }}>
                <Square size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Mood selector */}
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
              How are you feeling?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {moods.map((m) => {
                const selected = selectedMood === m.value
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setSelectedMood(selected ? null : m.value)}
                    activeOpacity={0.7}
                    style={{
                      alignItems: 'center', gap: 6, padding: 10,
                      borderRadius: 16,
                      backgroundColor: selected ? m.bg : 'transparent',
                      borderWidth: selected ? 2 : 0,
                      borderColor: selected ? m.color : 'transparent',
                    }}
                  >
                    <m.Icon size={28} color={selected ? m.color : '#d1d5db'} />
                    <Text style={{
                      fontSize: 11, fontWeight: '500',
                      color: selected ? m.color : '#9ca3af',
                    }}>{m.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Action bar — inside ScrollView so it's always visible */}
          <View style={{
            marginTop: 24,
            padding: 16, backgroundColor: '#fff', borderRadius: 20,
            borderWidth: 1, borderColor: '#f3f4f6',
            flexDirection: 'row', alignItems: 'center', gap: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
          }}>
            {/* Photo button */}
            {!imageUri && (
              <TouchableOpacity onPress={pickImage} style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
              }}>
                <ImageIcon size={22} color="#6b7280" />
              </TouchableOpacity>
            )}

            {/* Record button */}
            {!audioUri && !isRecording && (
              <TouchableOpacity onPress={startRecording} style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mic size={22} color="#6b7280" />
              </TouchableOpacity>
            )}

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || (!content.trim() && !imageUri && !audioUri)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                opacity: (saving || (!content.trim() && !imageUri && !audioUri)) ? 0.5 : 1,
              }}
            >
              <LinearGradient
                colors={currentIntent.colors}
                style={{
                  height: 48, borderRadius: 24,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Send size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Save</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ============================================
  // RENDER — INTENT SELECTION (default view)
  // ============================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14b8a6" />}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#171717' }}>Reflect</Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>
            {greeting.text}. Your safe space.
          </Text>
        </View>

        {/* Intent cards — 2x2 grid */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
          What brings you here?
        </Text>
        <View style={{ gap: 12, marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {intents.slice(0, 2).map((intent) => (
              <TouchableOpacity
                key={intent.id}
                activeOpacity={0.8}
                onPress={() => setSelectedIntent(intent.id)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={intent.colors}
                  style={{
                    borderRadius: 20, padding: 18, minHeight: 120,
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <intent.Icon size={22} color="#fff" />
                  </View>
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{intent.label}</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{intent.desc}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {intents.slice(2, 4).map((intent) => (
              <TouchableOpacity
                key={intent.id}
                activeOpacity={0.8}
                onPress={() => setSelectedIntent(intent.id)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={intent.colors}
                  style={{
                    borderRadius: 20, padding: 18, minHeight: 120,
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <intent.Icon size={22} color="#fff" />
                  </View>
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{intent.label}</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{intent.desc}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Past reflections */}
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717', marginBottom: 12 }}>
          Recent reflections
        </Text>

        {reflections.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0fdfa',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Feather size={28} color="#14b8a6" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717' }}>No reflections yet</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
              Choose an intent above to start reflecting.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {reflections.map((r) => {
              const intentObj = intents.find(i => i.id === r.intent)
              const moodObj = r.mood != null ? moods.find(m => m.value === r.mood) : null
              return (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: '#fff', borderRadius: 18, padding: 16,
                    borderWidth: 1, borderColor: '#f3f4f6',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
                  }}
                >
                  {/* Image preview */}
                  {r.image_url && (
                    <Image
                      source={{ uri: r.image_url }}
                      style={{
                        width: '100%', height: 140, borderRadius: 12,
                        backgroundColor: '#f3f4f6', marginBottom: 12,
                      }}
                      resizeMode="cover"
                    />
                  )}

                  {/* Audio indicator */}
                  {r.audio_url && !r.image_url && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: '#f0fdfa', borderRadius: 12, padding: 10, marginBottom: 12,
                    }}>
                      <Mic size={16} color="#14b8a6" />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#14b8a6' }}>Voice note attached</Text>
                    </View>
                  )}

                  {/* Content */}
                  {r.content ? (
                    <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 }} numberOfLines={3}>
                      {r.content}
                    </Text>
                  ) : null}

                  {/* Footer: intent badge + mood + time */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {intentObj && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                        backgroundColor: intentObj.colors[0] + '18',
                      }}>
                        <intentObj.Icon size={12} color={intentObj.colors[0]} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: intentObj.colors[0] }}>
                          {intentObj.label}
                        </Text>
                      </View>
                    )}

                    {moodObj && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 3,
                        borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
                        backgroundColor: moodObj.bg,
                      }}>
                        <moodObj.Icon size={12} color={moodObj.color} />
                      </View>
                    )}

                    <View style={{ flex: 1 }} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color="#d1d5db" />
                      <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                        {formatRelativeDate(r.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
