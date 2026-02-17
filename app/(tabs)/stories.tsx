import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Share,
  Image,
} from 'react-native'
import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Plus,
  BookOpen,
  Check,
  X,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Type,
  AlignLeft,
  Minus,
  MoreVertical,
  Clock,
  Globe,
  Lock,
  Copy,
  Share2,
  ArrowRight,
  ImageIcon,
  Mic,
  MicOff,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const SHARE_BASE_URL = 'https://app.bloomsline.care/stories'

// ============================================
// TYPES
// ============================================

interface ContentBlock {
  id: string
  type: 'text' | 'heading' | 'list' | 'divider' | 'media'
  content: any
  order: number
}

interface Story {
  id: string
  user_id: string
  title: string
  content: ContentBlock[]
  published: boolean
  unique_slug: string
  secret_code?: string | null
  created_at: string
  updated_at: string
}

// ============================================
// HELPERS
// ============================================

function generateSlug(title: string, userId?: string): string {
  const clean = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 7)
  return userId ? `${clean}-${userId.substring(0, 4)}-${ts}-${rand}` : `${clean}-${ts}-${rand}`
}

function genBlockId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function parseContent(raw: any): ContentBlock[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }
  return []
}

function getPreview(blocks: any): string {
  const parsed = parseContent(blocks)
  for (const b of parsed) {
    if (b.type === 'text' && b.content?.text) return b.content.text.substring(0, 120)
    if (b.type === 'heading' && b.content?.text) return b.content.text.substring(0, 120)
  }
  return ''
}

// ============================================
// BLOCK RENDERER (view mode)
// ============================================

function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    return () => { sound?.unloadAsync() }
  }, [sound])

  async function togglePlay() {
    if (sound) {
      if (playing) { await sound.pauseAsync(); setPlaying(false) }
      else { await sound.playAsync(); setPlaying(true) }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0)
            setDuration(status.durationMillis || 0)
            if (status.didJustFinish) { setPlaying(false); setPosition(0) }
          }
        }
      )
      setSound(newSound)
      setPlaying(true)
    }
  }

  function formatTime(ms: number) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <View style={{
      backgroundColor: '#fffbeb', borderRadius: 14, padding: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: '#fde68a',
    }}>
      <TouchableOpacity
        onPress={togglePlay}
        style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: '#f59e0b',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          {playing ? '❚❚' : '▶'}
        </Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={{ height: 4, backgroundColor: '#fde68a', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{
            height: 4, backgroundColor: '#f59e0b', borderRadius: 2,
            width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
          }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: '#92400e' }}>{formatTime(position)}</Text>
          <Text style={{ fontSize: 11, color: '#92400e' }}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  )
}

function RenderBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      const level = block.content?.level || 1
      const fontSize = level === 1 ? 20 : level === 2 ? 17 : 15
      return (
        <Text style={{ fontSize, fontWeight: '700', color: '#171717' }}>
          {block.content?.text || ''}
        </Text>
      )
    case 'text':
      return (
        <Text style={{ fontSize: 15, color: '#374151', lineHeight: 24 }}>
          {block.content?.text || ''}
        </Text>
      )
    case 'list': {
      const items: string[] = block.content?.items || []
      const ordered = block.content?.ordered || false
      return (
        <View style={{ gap: 4 }}>
          {items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ fontSize: 15, color: '#6b7280', width: 20 }}>
                {ordered ? `${i + 1}.` : '•'}
              </Text>
              <Text style={{ flex: 1, fontSize: 15, color: '#374151', lineHeight: 22 }}>{item}</Text>
            </View>
          ))}
        </View>
      )
    }
    case 'media': {
      // Handle both old format (single url) and new format (items array)
      const mediaItems = block.content?.items || (block.content?.url ? [{
        url: block.content.url,
        fileType: block.content.fileType,
        fileName: block.content.fileName,
        alt: block.content.alt,
      }] : [])

      if (mediaItems.length === 0) return null

      return (
        <View style={{ gap: 10 }}>
          {mediaItems.map((item: any, i: number) => (
            <View key={i}>
              {item.fileType === 'image' && (
                <Image
                  source={{ uri: item.url }}
                  style={{
                    width: '100%', height: undefined,
                    aspectRatio: 4 / 3, borderRadius: 14,
                    backgroundColor: '#f3f4f6',
                  }}
                  resizeMode="cover"
                />
              )}
              {item.fileType === 'audio' && (
                <AudioPlayer uri={item.url} />
              )}
              {item.fileType === 'video' && (
                <View style={{
                  backgroundColor: '#f3f4f6', borderRadius: 14, padding: 20,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Video playback not yet supported</Text>
                </View>
              )}
            </View>
          ))}
          {block.content?.caption && (
            <Text style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>
              {block.content.caption}
            </Text>
          )}
        </View>
      )
    }
    case 'divider':
      return <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 }} />
    default:
      return null
  }
}

// ============================================
// BLOCK EDITOR (edit mode)
// ============================================

function BlockActions({ onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  onRemove: () => void; onMoveUp?: () => void; onMoveDown?: () => void; isFirst?: boolean; isLast?: boolean
}) {
  return (
    <View style={{ gap: 2, alignItems: 'center' }}>
      {onMoveUp && !isFirst && (
        <TouchableOpacity onPress={onMoveUp} style={{ padding: 4 }}>
          <ChevronUp size={14} color="#9ca3af" />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onRemove} style={{ padding: 4 }}>
        <X size={14} color="#ef4444" />
      </TouchableOpacity>
      {onMoveDown && !isLast && (
        <TouchableOpacity onPress={onMoveDown} style={{ padding: 4 }}>
          <ChevronDown size={14} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  )
}

function EditBlock({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: ContentBlock
  onChange: (updated: ContentBlock) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  switch (block.type) {
    case 'heading':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={block.content?.text || ''}
              onChangeText={(t) => onChange({ ...block, content: { ...block.content, text: t } })}
              placeholder="Heading..."
              placeholderTextColor="#d1d5db"
              style={{
                fontSize: 18, fontWeight: '700', color: '#171717', padding: 12,
                backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
              }}
            />
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    case 'text':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={block.content?.text || ''}
              onChangeText={(t) => onChange({ ...block, content: { text: t } })}
              placeholder="Write something..."
              placeholderTextColor="#d1d5db"
              multiline
              style={{
                fontSize: 15, color: '#374151', lineHeight: 22, padding: 12,
                backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
                minHeight: 80, textAlignVertical: 'top',
              }}
            />
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    case 'list': {
      const items: string[] = block.content?.items || ['']
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            {items.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, color: '#9ca3af', width: 18 }}>
                  {block.content?.ordered ? `${i + 1}.` : '•'}
                </Text>
                <TextInput
                  value={item}
                  onChangeText={(t) => {
                    const newItems = [...items]
                    newItems[i] = t
                    onChange({ ...block, content: { ...block.content, items: newItems } })
                  }}
                  placeholder={`Item ${i + 1}...`}
                  placeholderTextColor="#d1d5db"
                  style={{
                    flex: 1, fontSize: 14, color: '#374151', padding: 8,
                    backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
                  }}
                />
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => {
                    onChange({ ...block, content: { ...block.content, items: items.filter((_, idx) => idx !== i) } })
                  }} style={{ padding: 4 }}>
                    <Minus size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={() => onChange({ ...block, content: { ...block.content, items: [...items, ''] } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
            >
              <Plus size={14} color="#14b8a6" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#14b8a6' }}>Add item</Text>
            </TouchableOpacity>
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    }
    case 'media': {
      const mediaItems = block.content?.items || []
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, gap: 8 }}>
            {mediaItems.map((item: any, i: number) => (
              <View key={i}>
                {item.fileType === 'image' && (
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: '100%', height: undefined, aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: '#f3f4f6' }}
                    resizeMode="cover"
                  />
                )}
                {item.fileType === 'audio' && (
                  <AudioPlayer uri={item.url} />
                )}
              </View>
            ))}
            {/* Caption */}
            <TextInput
              value={block.content?.caption || ''}
              onChangeText={(t) => onChange({ ...block, content: { ...block.content, caption: t } })}
              placeholder="Add a caption..."
              placeholderTextColor="#d1d5db"
              style={{
                fontSize: 13, color: '#6b7280', fontStyle: 'italic', padding: 8,
                backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
              }}
            />
          </View>
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    }
    case 'divider':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#d1d5db' }} />
          <BlockActions onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} isFirst={isFirst} isLast={isLast} />
        </View>
      )
    default:
      return null
  }
}

// ============================================
// MAIN SCREEN
// ============================================

export default function StoriesScreen() {
  const { user } = useAuth()

  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')

  // View story
  const [viewingStory, setViewingStory] = useState<Story | null>(null)

  // Editor
  const [editing, setEditing] = useState(false)
  const [editStory, setEditStory] = useState<Story | null>(null) // null = creating new
  const [editTitle, setEditTitle] = useState('')
  const [editBlocks, setEditBlocks] = useState<ContentBlock[]>([])
  const [editSaving, setEditSaving] = useState(false)

  // Action menu
  const [menuStoryId, setMenuStoryId] = useState<string | null>(null)

  // Publish modal
  const [publishModalVisible, setPublishModalVisible] = useState(false)
  const [publishStep, setPublishStep] = useState<'choose' | 'enter-code'>('choose')
  const [secretCode, setSecretCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [publishTarget, setPublishTarget] = useState<'editor' | 'story'>('editor') // where publish was triggered from
  const [publishingStory, setPublishingStory] = useState<Story | null>(null) // for publishing from view modal
  const [linkCopied, setLinkCopied] = useState(false)

  // ============================================
  // DATA
  // ============================================

  const fetchStories = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setStories((data || []).map((s: any) => ({ ...s, content: parseContent(s.content) })) as Story[])
    } catch (err) {
      console.error('Error fetching stories:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchStories() }, [fetchStories])

  async function onRefresh() {
    setRefreshing(true)
    await fetchStories()
    setRefreshing(false)
  }

  // ============================================
  // ACTIONS
  // ============================================

  function startCreate() {
    setEditStory(null)
    setEditTitle('')
    setEditBlocks([
      { id: genBlockId(), type: 'text', content: { text: '' }, order: 0 },
    ])
    setEditing(true)
  }

  function startEdit(story: Story) {
    setEditStory(story)
    setEditTitle(story.title)
    setEditBlocks(Array.isArray(story.content) ? [...story.content] : [
      { id: genBlockId(), type: 'text', content: { text: '' }, order: 0 },
    ])
    setMenuStoryId(null)
    setEditing(true)
  }

  async function saveStory(publish?: boolean, storySecretCode?: string | null) {
    if (!user?.id || !editTitle.trim()) {
      if (Platform.OS === 'web') alert('Please add a title.')
      else Alert.alert('Missing title', 'Please add a title for your story.')
      return
    }

    setEditSaving(true)
    try {
      const orderedBlocks = editBlocks.map((b, i) => ({ ...b, order: i }))

      if (editStory) {
        // Update existing
        const updateData: any = {
          title: editTitle.trim(),
          content: orderedBlocks,
          updated_at: new Date().toISOString(),
        }
        if (publish !== undefined) updateData.published = publish
        if (storySecretCode !== undefined) updateData.secret_code = storySecretCode

        const { error } = await supabase
          .from('stories')
          .update(updateData)
          .eq('id', editStory.id)

        if (error) throw error
      } else {
        // Create new
        const slug = generateSlug(editTitle.trim(), user.id)
        const insertData: any = {
          user_id: user.id,
          title: editTitle.trim(),
          content: orderedBlocks,
          published: publish || false,
          unique_slug: slug,
        }
        if (storySecretCode) insertData.secret_code = storySecretCode

        const { error } = await supabase
          .from('stories')
          .insert(insertData)

        if (error) throw error
      }

      setEditing(false)
      await fetchStories()
    } catch (err) {
      console.error('Error saving story:', err)
      if (Platform.OS === 'web') alert('Failed to save story.')
      else Alert.alert('Error', 'Failed to save story.')
    } finally {
      setEditSaving(false)
    }
  }

  // Publish a story directly (from view modal) — public or with secret code
  async function publishStory(story: Story, storySecretCode?: string | null) {
    try {
      const updateData: any = {
        published: true,
        updated_at: new Date().toISOString(),
      }
      if (storySecretCode !== undefined) updateData.secret_code = storySecretCode

      const { error } = await supabase
        .from('stories')
        .update(updateData)
        .eq('id', story.id)

      if (error) throw error
      setStories(prev => prev.map(s => s.id === story.id
        ? { ...s, published: true, secret_code: storySecretCode ?? s.secret_code }
        : s
      ))
      if (viewingStory?.id === story.id) {
        setViewingStory({ ...viewingStory, published: true, secret_code: storySecretCode ?? viewingStory.secret_code })
      }
    } catch (err) {
      console.error('Error publishing story:', err)
    }
  }

  async function unpublishStory(story: Story) {
    setMenuStoryId(null)
    try {
      const { error } = await supabase
        .from('stories')
        .update({ published: false, secret_code: null, updated_at: new Date().toISOString() })
        .eq('id', story.id)

      if (error) throw error
      setStories(prev => prev.map(s => s.id === story.id ? { ...s, published: false, secret_code: null } : s))
      if (viewingStory?.id === story.id) {
        setViewingStory({ ...viewingStory, published: false, secret_code: null })
      }
    } catch (err) {
      console.error('Error unpublishing story:', err)
    }
  }

  // Publish modal helpers
  function openPublishModal(target: 'editor' | 'story', story?: Story) {
    setPublishStep('choose')
    setSecretCode('')
    setConfirmCode('')
    setPublishTarget(target)
    setPublishingStory(story || null)
    setPublishModalVisible(true)
  }

  function closePublishModal() {
    setPublishModalVisible(false)
    setSecretCode('')
    setConfirmCode('')
  }

  async function handlePublicPublish() {
    closePublishModal()
    if (publishTarget === 'editor') {
      await saveStory(true, null)
    } else if (publishingStory) {
      await publishStory(publishingStory, null)
    }
  }

  async function handlePrivatePublish() {
    if (secretCode.trim().length < 4 || secretCode !== confirmCode) return
    closePublishModal()
    if (publishTarget === 'editor') {
      await saveStory(true, secretCode.trim())
    } else if (publishingStory) {
      await publishStory(publishingStory, secretCode.trim())
    }
  }

  function getShareUrl(story: Story): string {
    return `${SHARE_BASE_URL}/${story.unique_slug}`
  }

  async function copyShareLink(story: Story) {
    const url = getShareUrl(story)
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(url) } catch {}
    } else {
      await Clipboard.setStringAsync(url)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function shareStory(story: Story) {
    const url = getShareUrl(story)
    const message = story.secret_code
      ? `Check out my story "${story.title}": ${url}\nSecret code: ${story.secret_code}`
      : `Check out my story "${story.title}": ${url}`

    if (Platform.OS === 'web') {
      if (navigator.share) {
        try { await navigator.share({ title: story.title, text: message, url }) } catch {}
      } else {
        await copyShareLink(story)
      }
    } else {
      try { await Share.share({ message }) } catch {}
    }
  }

  function confirmDelete(story: Story) {
    setMenuStoryId(null)
    if (Platform.OS === 'web') {
      if (confirm(`Delete "${story.title}"? This cannot be undone.`)) deleteStory(story.id)
    } else {
      Alert.alert('Delete Story', `Delete "${story.title}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteStory(story.id) },
      ])
    }
  }

  async function deleteStory(id: string) {
    try {
      const { error } = await supabase.from('stories').delete().eq('id', id)
      if (error) throw error
      setStories(prev => prev.filter(s => s.id !== id))
      if (viewingStory?.id === id) setViewingStory(null)
    } catch (err) {
      console.error('Error deleting story:', err)
    }
  }

  // Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Block editing helpers
  function addBlock(type: ContentBlock['type']) {
    const newBlock: ContentBlock = {
      id: genBlockId(),
      type,
      content: type === 'text' ? { text: '' }
        : type === 'heading' ? { text: '', level: 2 }
        : type === 'list' ? { items: [''], ordered: false }
        : type === 'media' ? { items: [] }
        : {},
      order: editBlocks.length,
    }
    setEditBlocks(prev => [...prev, newBlock])
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    const newBlocks = [...editBlocks]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return
    ;[newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]]
    setEditBlocks(newBlocks)
  }

  async function uploadToStorage(uri: string, fileName: string, mimeType: string): Promise<string | null> {
    if (!user?.id) return null
    setUploading(true)
    try {
      const response = await fetch(uri)
      const blob = await response.blob()
      const path = `${user.id}/${Date.now()}-${fileName}`

      const { error } = await supabase.storage
        .from('story-media')
        .upload(path, blob, { contentType: mimeType, upsert: false })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('story-media')
        .getPublicUrl(path)

      return urlData.publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      if (Platform.OS === 'web') alert('Failed to upload file.')
      else Alert.alert('Upload Error', 'Failed to upload file.')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    })

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const fileName = asset.fileName || `image-${Date.now()}.jpg`
    const publicUrl = await uploadToStorage(asset.uri, fileName, asset.mimeType || 'image/jpeg')
    if (!publicUrl) return

    const mediaBlock: ContentBlock = {
      id: genBlockId(),
      type: 'media',
      content: {
        items: [{ url: publicUrl, fileType: 'image', fileName, alt: '' }],
        caption: '',
      },
      order: editBlocks.length,
    }
    setEditBlocks(prev => [...prev, mediaBlock])
  }

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow microphone access to record voice notes.')
        return
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      setRecording(rec)
      setRecordingDuration(0)

      // Track duration
      rec.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          setRecordingDuration(status.durationMillis || 0)
        }
      })
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  async function stopRecording() {
    if (!recording) return
    try {
      await recording.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })

      const uri = recording.getURI()
      setRecording(null)
      setRecordingDuration(0)

      if (!uri) return

      const fileName = `voice-${Date.now()}.m4a`
      const publicUrl = await uploadToStorage(uri, fileName, 'audio/m4a')
      if (!publicUrl) return

      const mediaBlock: ContentBlock = {
        id: genBlockId(),
        type: 'media',
        content: {
          items: [{ url: publicUrl, fileType: 'audio', fileName }],
          caption: '',
        },
        order: editBlocks.length,
      }
      setEditBlocks(prev => [...prev, mediaBlock])
    } catch (err) {
      console.error('Failed to stop recording:', err)
    }
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </SafeAreaView>
    )
  }

  // ============================================
  // COMPUTED
  // ============================================

  const publishedCount = stories.filter(s => s.published).length
  const draftCount = stories.filter(s => !s.published).length
  const filtered = filter === 'all' ? stories
    : filter === 'published' ? stories.filter(s => s.published)
    : stories.filter(s => !s.published)

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#171717' }}>My Stories</Text>
          <TouchableOpacity onPress={startCreate} style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: '#f59e0b', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
          }}>
            <Plus size={18} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#f59e0b' }}>{stories.length}</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Total</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#059669' }}>{publishedCount}</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Published</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#6b7280' }}>{draftCount}</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Drafts</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {([
            { key: 'all' as const, label: 'All' },
            { key: 'published' as const, label: 'Published' },
            { key: 'draft' as const, label: 'Drafts' },
          ]).map((tab) => {
            const active = filter === tab.key
            return (
              <TouchableOpacity key={tab.key} onPress={() => setFilter(tab.key)} style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                backgroundColor: active ? '#f59e0b' : '#f3f4f6',
              }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#6b7280' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Story list */}
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef3c7',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <BookOpen size={32} color="#f59e0b" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#171717' }}>
              {filter === 'all' ? 'No stories yet' : filter === 'published' ? 'No published stories' : 'No drafts'}
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
              {filter === 'all' ? 'Tap Create to write your first story.' : 'Your stories will appear here.'}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity onPress={startCreate} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
                backgroundColor: '#f59e0b', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12,
              }}>
                <Plus size={18} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Create Story</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((story) => {
              const preview = getPreview(story.content)
              return (
                <TouchableOpacity
                  key={story.id}
                  activeOpacity={0.7}
                  onPress={() => setViewingStory(story)}
                  style={{
                    backgroundColor: '#fff', borderRadius: 18, padding: 16,
                    borderWidth: 1, borderColor: '#f3f4f6',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
                  }}
                >
                  {/* Top row: badges + menu */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: story.published ? '#ecfdf5' : '#f3f4f6',
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                      }}>
                        {story.published ? <Globe size={11} color="#059669" /> : <FileText size={11} color="#6b7280" />}
                        <Text style={{ fontSize: 11, fontWeight: '600', color: story.published ? '#059669' : '#6b7280' }}>
                          {story.published ? 'Published' : 'Draft'}
                        </Text>
                      </View>
                      {story.secret_code && (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 3,
                          backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
                        }}>
                          <Lock size={10} color="#92400e" />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: '#92400e' }}>Code</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => setMenuStoryId(menuStoryId === story.id ? null : story.id)}
                      style={{ padding: 4 }}
                    >
                      <MoreVertical size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>

                  {/* Title */}
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717', marginBottom: 4 }} numberOfLines={2}>
                    {story.title}
                  </Text>

                  {/* Preview */}
                  {preview ? (
                    <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>
                      {preview}
                    </Text>
                  ) : null}

                  {/* Date */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color="#d1d5db" />
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                      Updated {formatDate(story.updated_at)}
                    </Text>
                  </View>

                  {/* Action menu dropdown */}
                  {menuStoryId === story.id && (
                    <View style={{
                      position: 'absolute', top: 40, right: 12, zIndex: 10,
                      backgroundColor: '#fff', borderRadius: 14, padding: 6, minWidth: 160,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 10,
                      borderWidth: 1, borderColor: '#f3f4f6',
                    }}>
                      <TouchableOpacity
                        onPress={() => startEdit(story)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}
                      >
                        <Edit3 size={16} color="#374151" />
                        <Text style={{ fontSize: 14, color: '#374151' }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setMenuStoryId(null)
                          if (story.published) { unpublishStory(story) }
                          else { openPublishModal('story', story) }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}
                      >
                        {story.published ? <EyeOff size={16} color="#374151" /> : <Eye size={16} color="#374151" />}
                        <Text style={{ fontSize: 14, color: '#374151' }}>{story.published ? 'Unpublish' : 'Publish'}</Text>
                      </TouchableOpacity>
                      {story.published && (
                        <TouchableOpacity
                          onPress={() => { setMenuStoryId(null); shareStory(story) }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}
                        >
                          <Share2 size={16} color="#374151" />
                          <Text style={{ fontSize: 14, color: '#374151' }}>Share Link</Text>
                        </TouchableOpacity>
                      )}
                      <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 2, marginHorizontal: 8 }} />
                      <TouchableOpacity
                        onPress={() => confirmDelete(story)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                        <Text style={{ fontSize: 14, color: '#ef4444' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* ============================================ */}
      {/* VIEW STORY MODAL */}
      {/* ============================================ */}
      <Modal visible={!!viewingStory} animationType="slide" onRequestClose={() => setViewingStory(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          {viewingStory && (
            <>
              {/* Header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', padding: 16,
                borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
              }}>
                <TouchableOpacity onPress={() => setViewingStory(null)} style={{ padding: 4, marginRight: 12 }}>
                  <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717' }} numberOfLines={1}>
                    {viewingStory.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 3,
                      backgroundColor: viewingStory.published ? '#ecfdf5' : '#f3f4f6',
                      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: viewingStory.published ? '#059669' : '#6b7280' }}>
                        {viewingStory.published ? 'Published' : 'Draft'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>{formatDate(viewingStory.updated_at)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setViewingStory(null); startEdit(viewingStory) }} style={{ padding: 6 }}>
                  <Edit3 size={20} color="#f59e0b" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}>
                {Array.isArray(viewingStory.content) && viewingStory.content.length > 0 ? (
                  viewingStory.content
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((block) => <RenderBlock key={block.id} block={block} />)
                ) : (
                  <Text style={{ fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
                    This story has no content yet.
                  </Text>
                )}

                {/* Share URL section for published stories */}
                {viewingStory.published && (
                  <View style={{
                    marginTop: 20, backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
                    borderWidth: 1, borderColor: '#bbf7d0',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Globe size={16} color="#059669" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#059669' }}>
                        {viewingStory.secret_code ? 'Private Link' : 'Public Link'}
                      </Text>
                      {viewingStory.secret_code && (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                          <Lock size={10} color="#92400e" />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: '#92400e' }}>Code Protected</Text>
                        </View>
                      )}
                    </View>

                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: '#fff', borderRadius: 10, padding: 10,
                      borderWidth: 1, borderColor: '#e5e7eb',
                    }}>
                      <Text style={{ flex: 1, fontSize: 12, color: '#6b7280' }} numberOfLines={1}>
                        {getShareUrl(viewingStory)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => copyShareLink(viewingStory)}
                        style={{
                          backgroundColor: linkCopied ? '#059669' : '#f3f4f6',
                          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                        }}
                      >
                        {linkCopied ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Check size={14} color="#fff" />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Copied</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Copy size={14} color="#374151" />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Copy</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {viewingStory.secret_code && (
                      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Lock size={14} color="#92400e" />
                        <Text style={{ fontSize: 13, color: '#92400e' }}>
                          Secret code: <Text style={{ fontWeight: '700' }}>{viewingStory.secret_code}</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Bottom actions */}
              <View style={{
                padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#f3f4f6',
                gap: 10,
              }}>
                {/* Row 1: Edit + Publish/Unpublish */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => { setViewingStory(null); startEdit(viewingStory) }}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      paddingVertical: 14, borderRadius: 14, backgroundColor: '#f3f4f6',
                    }}
                  >
                    <Edit3 size={18} color="#374151" />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Edit</Text>
                  </TouchableOpacity>
                  {viewingStory.published ? (
                    <TouchableOpacity
                      onPress={() => unpublishStory(viewingStory)}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        paddingVertical: 14, borderRadius: 14, backgroundColor: '#f3f4f6',
                      }}
                    >
                      <EyeOff size={18} color="#374151" />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Unpublish</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => openPublishModal('story', viewingStory)}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        paddingVertical: 14, borderRadius: 14, backgroundColor: '#f59e0b',
                      }}
                    >
                      <Globe size={18} color="#fff" />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Publish</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {/* Row 2: Share button (only for published) */}
                {viewingStory.published && (
                  <TouchableOpacity
                    onPress={() => shareStory(viewingStory)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      paddingVertical: 14, borderRadius: 14,
                      backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
                    }}
                  >
                    <Share2 size={18} color="#2563eb" />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#2563eb' }}>Share Story</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* ============================================ */}
      {/* EDITOR MODAL */}
      {/* ============================================ */}
      <Modal visible={editing} animationType="slide" onRequestClose={() => {
        if (Platform.OS === 'web') {
          if (confirm('Discard changes?')) setEditing(false)
        } else {
          Alert.alert('Discard changes?', 'Unsaved changes will be lost.', [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => setEditing(false) },
          ])
        }
      }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          {/* Editor header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', padding: 16,
            borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          }}>
            <TouchableOpacity onPress={() => {
              if (Platform.OS === 'web') {
                if (confirm('Discard changes?')) setEditing(false)
              } else {
                Alert.alert('Discard changes?', '', [
                  { text: 'Keep editing', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => setEditing(false) },
                ])
              }
            }} style={{ padding: 4, marginRight: 12 }}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717', flex: 1 }}>
              {editStory ? 'Edit Story' : 'New Story'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => saveStory(false)}
                disabled={editSaving}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f3f4f6' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                  {editSaving ? 'Saving...' : 'Save Draft'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openPublishModal('editor')}
                disabled={editSaving}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f59e0b' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {/* Title */}
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Story title..."
              placeholderTextColor="#d1d5db"
              style={{
                fontSize: 24, fontWeight: '800', color: '#171717', marginBottom: 20,
                padding: 0,
              }}
            />

            {/* Blocks */}
            <View style={{ gap: 12 }}>
              {editBlocks.map((block, i) => (
                <EditBlock
                  key={block.id}
                  block={block}
                  isFirst={i === 0}
                  isLast={i === editBlocks.length - 1}
                  onChange={(updated) => {
                    const newBlocks = [...editBlocks]
                    newBlocks[i] = updated
                    setEditBlocks(newBlocks)
                  }}
                  onRemove={() => {
                    if (editBlocks.length > 1) {
                      setEditBlocks(editBlocks.filter((_, idx) => idx !== i))
                    }
                  }}
                  onMoveUp={() => moveBlock(i, 'up')}
                  onMoveDown={() => moveBlock(i, 'down')}
                />
              ))}
            </View>

            {/* Uploading indicator */}
            {uploading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#fef3c7', borderRadius: 12 }}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={{ fontSize: 13, color: '#92400e' }}>Uploading...</Text>
              </View>
            )}
          </ScrollView>

          {/* Add block toolbar */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36, backgroundColor: '#fff',
            borderTopWidth: 1, borderTopColor: '#f3f4f6',
            shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6,
          }}>
            {/* Recording indicator */}
            {recording && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 10, padding: 10, backgroundColor: '#fef2f2', borderRadius: 12,
              }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#dc2626' }}>
                  Recording {Math.floor(recordingDuration / 1000)}s
                </Text>
                <TouchableOpacity
                  onPress={stopRecording}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#ef4444', borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Stop</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity onPress={() => addBlock('text')} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <AlignLeft size={16} color="#374151" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => addBlock('heading')} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <Type size={16} color="#374151" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Heading</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => addBlock('list')} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <FileText size={16} color="#374151" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>List</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} disabled={uploading} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <ImageIcon size={16} color="#2563eb" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#2563eb' }}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={recording ? stopRecording : startRecording}
                disabled={uploading}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: recording ? '#fef2f2' : '#fdf2f8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                }}
              >
                {recording ? <MicOff size={16} color="#dc2626" /> : <Mic size={16} color="#db2777" />}
                <Text style={{ fontSize: 13, fontWeight: '500', color: recording ? '#dc2626' : '#db2777' }}>
                  {recording ? 'Stop' : 'Voice'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => addBlock('divider')} style={{
                backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
              }}>
                <Minus size={16} color="#374151" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================ */}
      {/* PUBLISH MODAL */}
      {/* ============================================ */}
      <Modal visible={publishModalVisible} animationType="fade" transparent onRequestClose={closePublishModal}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 20,
        }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 420,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
            }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#171717' }}>Publish Your Story</Text>
                <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
                  {publishStep === 'choose' ? 'Choose how you want to share' : 'Create your secret code'}
                </Text>
              </View>
              <TouchableOpacity onPress={closePublishModal} style={{ padding: 6 }}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              {publishStep === 'choose' ? (
                <View style={{ gap: 12 }}>
                  {/* Public option */}
                  <TouchableOpacity
                    onPress={handlePublicPublish}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                      borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#fff',
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 48, height: 48, borderRadius: 14, backgroundColor: '#ecfdf5',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Globe size={24} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717', marginBottom: 2 }}>Share Openly</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 17 }}>
                        Anyone with the link can view your story.
                      </Text>
                    </View>
                    <ArrowRight size={18} color="#d1d5db" />
                  </TouchableOpacity>

                  {/* Private option */}
                  <TouchableOpacity
                    onPress={() => setPublishStep('enter-code')}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                      borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#fff',
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 48, height: 48, borderRadius: 14, backgroundColor: '#f5f3ff',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Lock size={24} color="#7c3aed" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717', marginBottom: 2 }}>Keep It Private</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 17 }}>
                        Only people with your secret code can view.
                      </Text>
                    </View>
                    <ArrowRight size={18} color="#d1d5db" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {/* Info banner */}
                  <View style={{
                    backgroundColor: '#f5f3ff', borderRadius: 14, padding: 14,
                    flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#e9d5ff',
                  }}>
                    <Lock size={18} color="#7c3aed" style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6d28d9', marginBottom: 2 }}>
                        Create a memorable code
                      </Text>
                      <Text style={{ fontSize: 12, color: '#7c3aed', lineHeight: 17 }}>
                        You'll share this code with anyone you want to view your story.
                      </Text>
                    </View>
                  </View>

                  {/* Secret code input */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                      Secret Code <Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <TextInput
                      value={secretCode}
                      onChangeText={setSecretCode}
                      placeholder="Enter your secret code (min. 4 characters)"
                      placeholderTextColor="#d1d5db"
                      autoFocus
                      style={{
                        fontSize: 15, color: '#171717', padding: 14,
                        backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
                      }}
                    />
                  </View>

                  {/* Confirm code input */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                      Confirm Code <Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <TextInput
                      value={confirmCode}
                      onChangeText={setConfirmCode}
                      placeholder="Re-enter your secret code"
                      placeholderTextColor="#d1d5db"
                      style={{
                        fontSize: 15, color: '#171717', padding: 14,
                        backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
                      }}
                    />
                    {confirmCode.length > 0 && secretCode !== confirmCode && (
                      <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Codes don't match</Text>
                    )}
                  </View>

                  {/* Action buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => { setPublishStep('choose'); setSecretCode(''); setConfirmCode('') }}
                      style={{
                        flex: 1, paddingVertical: 14, borderRadius: 14,
                        backgroundColor: '#f3f4f6', alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handlePrivatePublish}
                      disabled={secretCode.trim().length < 4 || secretCode !== confirmCode}
                      style={{
                        flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                        backgroundColor: (secretCode.trim().length >= 4 && secretCode === confirmCode) ? '#7c3aed' : '#e5e7eb',
                      }}
                    >
                      <Text style={{
                        fontSize: 15, fontWeight: '600',
                        color: (secretCode.trim().length >= 4 && secretCode === confirmCode) ? '#fff' : '#9ca3af',
                      }}>
                        Publish with Code
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
