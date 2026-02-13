import { useState, useEffect, useCallback } from 'react'
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
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import {
  User,
  Calendar,
  Clock,
  Video,
  MapPin,
  Phone,
  Check,
  RefreshCw,
  X,
  ChevronRight,
  FileText,
  CheckCircle2,
  Sparkles,
  CalendarCheck,
  Users,
  BookOpen,
  ArrowLeft,
  Plus,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

interface PractitionerProfile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  headline: string | null
  credentials: string[]
  specialties: string[]
}

interface UpcomingSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  session_type: string
  session_format: string
  status: string
  member_confirmed: boolean
  reschedule_requested: boolean
  reschedule_status: 'pending' | 'proposed' | 'accepted' | 'declined' | null
  practitioner_proposed_date: string | null
  notes: string | null
  practitioner: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

interface ResourceItem {
  id: string
  resourceId: string
  type: 'assignment' | 'shared'
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  dueDate: string | null
  instructions: string | null
  resourceType: string | null
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function getSessionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    initial: 'Initial Session',
    follow_up: 'Follow-up',
    emergency: 'Emergency',
    assessment: 'Assessment',
  }
  return labels[type] || type
}

function getSessionFormatIcon(format: string) {
  switch (format) {
    case 'video': return Video
    case 'in_person': return MapPin
    case 'phone': return Phone
    default: return Calendar
  }
}

function getSessionFormatLabel(format: string): string {
  switch (format) {
    case 'video': return 'Video'
    case 'in_person': return 'In Person'
    case 'phone': return 'Phone'
    default: return format
  }
}

function extractLocalized(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val.en || Object.values(val)[0] || ''
}

// ============================================
// BLOCK RENDERER
// ============================================

function renderBlock(
  block: any,
  blockValue: unknown,
  onBlockChange: (v: unknown) => void,
) {
  const content = typeof block.content === 'string' ? block.content : extractLocalized(block.content)
  const isRequired = !!block.required

  switch (block.type) {
    // ── Display blocks ──
    case 'heading':
      return <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>{content}</Text>

    case 'paragraph':
      return <Text style={{ fontSize: 15, color: '#4b5563', lineHeight: 22 }}>{content}</Text>

    case 'quote':
      return (
        <View style={{ borderLeftWidth: 3, borderLeftColor: '#2dd4bf', paddingLeft: 16, paddingVertical: 8, backgroundColor: '#f0fdfa', borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
          <Text style={{ fontSize: 15, color: '#4b5563', fontStyle: 'italic' }}>{content}</Text>
        </View>
      )

    case 'tip':
      return (
        <View style={{ padding: 16, backgroundColor: '#ecfdf5', borderRadius: 16, borderWidth: 1, borderColor: '#a7f3d0' }}>
          <Text style={{ fontSize: 15, color: '#065f46' }}>
            <Text style={{ fontWeight: '600' }}>{'💡 Tip: '}</Text>{content}
          </Text>
        </View>
      )

    case 'divider':
      return <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 }} />

    case 'key_points': {
      const points: string[] = Array.isArray(block.points) ? block.points : []
      return (
        <View>
          {content ? <Text style={{ fontWeight: '600', color: '#171717', marginBottom: 8, fontSize: 15 }}>{content}</Text> : null}
          {points.map((pt, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6', marginTop: 6 }} />
              <Text style={{ flex: 1, fontSize: 15, color: '#374151' }}>{typeof pt === 'string' ? pt : ''}</Text>
            </View>
          ))}
        </View>
      )
    }

    case 'callout': {
      const ct = block.calloutType || 'info'
      const cs: Record<string, { bg: string; border: string; text: string }> = {
        info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
        warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
        success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
        tip: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
        example: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' },
      }
      const s = cs[ct] || cs.info
      return (
        <View style={{ padding: 16, backgroundColor: s.bg, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: s.border }}>
          <Text style={{ fontSize: 15, color: s.text, lineHeight: 22 }}>{content}</Text>
        </View>
      )
    }

    // ── Interactive blocks ──
    case 'prompt':
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 8 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <TextInput
            value={(blockValue as string) || ''}
            onChangeText={(t) => onBlockChange(t)}
            placeholder="Share your thoughts..."
            placeholderTextColor="#d1d5db"
            multiline
            style={{
              backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, fontSize: 15,
              borderWidth: 2, borderColor: '#f3f4f6', color: '#374151',
              minHeight: 120, textAlignVertical: 'top',
            }}
          />
        </View>
      )

    case 'multiple_choice': {
      const opts: any[] = Array.isArray(block.options) ? block.options : Array.isArray(block.choices) ? block.choices : []
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ gap: 8 }}>
            {opts.map((opt, i) => {
              const label = typeof opt === 'string' ? opt : opt.label
              const sel = blockValue === i
              return (
                <TouchableOpacity key={i} onPress={() => onBlockChange(i)} activeOpacity={0.7} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16, borderWidth: 2,
                  borderColor: sel ? '#2dd4bf' : '#f3f4f6',
                  backgroundColor: sel ? '#f0fdfa' : '#fafafa',
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                    borderColor: sel ? '#14b8a6' : '#d1d5db',
                    backgroundColor: sel ? '#14b8a6' : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                  </View>
                  <Text style={{ fontSize: 15, color: sel ? '#0f766e' : '#4b5563', fontWeight: sel ? '600' : '400', flex: 1 }}>
                    {label || `Option ${i + 1}`}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    case 'yes_no':
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['yes', 'no'] as const).map((val) => {
              const sel = blockValue === val
              return (
                <TouchableOpacity key={val} onPress={() => onBlockChange(val)} activeOpacity={0.7} style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  padding: 16, borderRadius: 16, borderWidth: 2,
                  borderColor: sel ? (val === 'yes' ? '#a7f3d0' : '#d1d5db') : '#f3f4f6',
                  backgroundColor: sel ? (val === 'yes' ? '#ecfdf5' : '#f3f4f6') : '#fafafa',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? (val === 'yes' ? '#059669' : '#374151') : '#9ca3af' }}>
                    {val === 'yes' ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )

    case 'checklist': {
      const items: any[] = Array.isArray(block.items) ? block.items : []
      const checked: number[] = Array.isArray(blockValue) ? (blockValue as number[]) : []
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ gap: 8 }}>
            {items.map((item, i) => {
              const txt = typeof item === 'string' ? item : item.text
              const on = checked.includes(i)
              return (
                <TouchableOpacity key={i} onPress={() => onBlockChange(on ? checked.filter((x) => x !== i) : [...checked, i])} activeOpacity={0.7} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, borderRadius: 16, borderWidth: 2,
                  borderColor: on ? '#2dd4bf' : '#f3f4f6',
                  backgroundColor: on ? '#f0fdfa' : '#fafafa',
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                    borderColor: on ? '#14b8a6' : '#d1d5db',
                    backgroundColor: on ? '#14b8a6' : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {on && <Check size={14} color="#fff" />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, color: on ? '#0f766e' : '#4b5563', fontWeight: on ? '600' : '400' }}>{txt}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    case 'scale': {
      const mn = (block.scaleMin ?? 1) as number
      const mx = (block.scaleMax ?? 10) as number
      const nums = Array.from({ length: mx - mn + 1 }, (_, i) => mn + i)
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {nums.map((n) => (
              <TouchableOpacity key={n} onPress={() => onBlockChange(n)} style={{
                width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: blockValue === n ? '#14b8a6' : '#f9fafb',
                borderWidth: 2, borderColor: blockValue === n ? '#14b8a6' : '#f3f4f6',
              }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: blockValue === n ? '#fff' : '#4b5563' }}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {(block.scaleMinLabel || block.scaleMaxLabel) && (
            <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
              {mn} = {block.scaleMinLabel || ''} · {mx} = {block.scaleMaxLabel || ''}
            </Text>
          )}
        </View>
      )
    }

    case 'likert': {
      const scaleType = block.scaleType || 'likert'
      const scale = (block.scaleRange || block.likertScale || 5) as number
      const labels = block.likertLabels || {}
      const scaleLabels: string[] = block.scaleLabels || []

      if (scaleType === 'mood') {
        const moods = [
          { emoji: '😣', label: 'Struggling', value: 1 },
          { emoji: '😔', label: 'Low', value: 2 },
          { emoji: '😐', label: 'Okay', value: 3 },
          { emoji: '😊', label: 'Good', value: 4 },
          { emoji: '😄', label: 'Thriving', value: 5 },
        ]
        return (
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
              {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {moods.map((m) => (
                <TouchableOpacity key={m.value} onPress={() => onBlockChange(m.value)} style={{
                  alignItems: 'center', padding: 10, borderRadius: 16,
                  backgroundColor: blockValue === m.value ? '#f0fdfa' : '#fafafa',
                  borderWidth: 2, borderColor: blockValue === m.value ? '#2dd4bf' : 'transparent',
                }}>
                  <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                  <Text style={{ fontSize: 10, color: blockValue === m.value ? '#0f766e' : '#9ca3af', fontWeight: '500', marginTop: 4 }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      }

      if (scaleType === 'rating') {
        return (
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
              {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity key={n} onPress={() => onBlockChange(n)}>
                  <Text style={{ fontSize: 32, color: blockValue !== undefined && n <= (blockValue as number) ? '#f59e0b' : '#e5e7eb' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      }

      // Default likert
      const nums = Array.from({ length: scale }, (_, i) => i + 1)
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {nums.map((n) => (
              <TouchableOpacity key={n} onPress={() => onBlockChange(n)} style={{
                width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: blockValue === n ? '#14b8a6' : '#f9fafb',
                borderWidth: 2, borderColor: blockValue === n ? '#14b8a6' : '#f3f4f6',
              }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: blockValue === n ? '#fff' : '#4b5563' }}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {(scaleLabels[0] || labels.start || scaleLabels[scaleLabels.length - 1] || labels.end) && (
            <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
              1 = {scaleLabels[0] || labels.start || ''} · {scale} = {scaleLabels[scaleLabels.length - 1] || labels.end || ''}
            </Text>
          )}
        </View>
      )
    }

    case 'mood': {
      const emojiMap: Record<string, string> = { Angry: '😣', Frown: '😔', Meh: '😐', Smile: '😊', Laugh: '😄' }
      const moodOpts: any[] = Array.isArray(block.moodOptions) ? block.moodOptions : [
        { emoji: 'Angry', label: 'Struggling', value: 1 },
        { emoji: 'Frown', label: 'Low', value: 2 },
        { emoji: 'Meh', label: 'Okay', value: 3 },
        { emoji: 'Smile', label: 'Good', value: 4 },
        { emoji: 'Laugh', label: 'Thriving', value: 5 },
      ]
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {moodOpts.map((m, i) => {
              const val = m.value ?? i + 1
              return (
                <TouchableOpacity key={i} onPress={() => onBlockChange(val)} style={{
                  alignItems: 'center', padding: 10, borderRadius: 16,
                  backgroundColor: blockValue === val ? '#f0fdfa' : '#fafafa',
                  borderWidth: 2, borderColor: blockValue === val ? '#2dd4bf' : 'transparent',
                }}>
                  <Text style={{ fontSize: 28 }}>{emojiMap[m.emoji] || m.emoji}</Text>
                  <Text style={{ fontSize: 10, color: blockValue === val ? '#0f766e' : '#9ca3af', fontWeight: '500', marginTop: 4 }}>{m.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    case 'slider': {
      const sMin = (block.sliderMin ?? 0) as number
      const sMax = (block.sliderMax ?? 100) as number
      const sStep = (block.sliderStep ?? 1) as number
      const sUnit = (block.sliderUnit || '') as string
      const range = (sMax - sMin) / sStep
      if (range <= 20) {
        const nums = Array.from({ length: Math.floor(range) + 1 }, (_, i) => sMin + i * sStep)
        return (
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
              {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#14b8a6', marginBottom: 8 }}>
              {blockValue !== undefined ? `${blockValue}${sUnit}` : '-'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {nums.map((n) => (
                <TouchableOpacity key={n} onPress={() => onBlockChange(n)} style={{
                  minWidth: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
                  backgroundColor: blockValue === n ? '#14b8a6' : '#f9fafb',
                  borderWidth: 2, borderColor: blockValue === n ? '#14b8a6' : '#f3f4f6',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: blockValue === n ? '#fff' : '#4b5563' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      }
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={blockValue !== undefined ? String(blockValue) : ''}
              onChangeText={(t) => { const n = Number(t); if (!isNaN(n)) onBlockChange(n) }}
              keyboardType="numeric"
              placeholder={`${sMin} – ${sMax}`}
              placeholderTextColor="#d1d5db"
              style={{
                flex: 1, backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, fontSize: 16,
                borderWidth: 2, borderColor: '#f3f4f6', color: '#374151', textAlign: 'center',
              }}
            />
            {sUnit ? <Text style={{ fontSize: 14, color: '#6b7280' }}>{sUnit}</Text> : null}
          </View>
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
            {sMin}{sUnit} – {sMax}{sUnit}
          </Text>
        </View>
      )
    }

    case 'numeric':
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 8 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <TextInput
            value={blockValue !== undefined && blockValue !== null ? String(blockValue) : ''}
            onChangeText={(t) => { if (t === '') onBlockChange(undefined); else { const n = Number(t); if (!isNaN(n)) onBlockChange(n) } }}
            keyboardType="numeric"
            placeholder="Enter a number..."
            placeholderTextColor="#d1d5db"
            style={{
              backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, fontSize: 16,
              borderWidth: 2, borderColor: '#f3f4f6', color: '#374151',
            }}
          />
        </View>
      )

    case 'date_picker':
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 8 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <TextInput
            value={(blockValue as string) || ''}
            onChangeText={(t) => onBlockChange(t)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#d1d5db"
            style={{
              backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, fontSize: 15,
              borderWidth: 2, borderColor: '#f3f4f6', color: '#374151',
            }}
          />
        </View>
      )

    case 'time_input':
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 8 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <TextInput
            value={(blockValue as string) || ''}
            onChangeText={(t) => onBlockChange(t)}
            placeholder="HH:MM"
            placeholderTextColor="#d1d5db"
            style={{
              backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, fontSize: 15,
              borderWidth: 2, borderColor: '#f3f4f6', color: '#374151',
            }}
          />
        </View>
      )

    case 'list_input': {
      const listItems: string[] = Array.isArray(blockValue) ? (blockValue as string[]) : ['']
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ gap: 8 }}>
            {listItems.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '600' }}>{i + 1}</Text>
                </View>
                <TextInput
                  value={item}
                  onChangeText={(t) => { const a = [...listItems]; a[i] = t; onBlockChange(a) }}
                  placeholder={`Item ${i + 1}...`}
                  placeholderTextColor="#d1d5db"
                  style={{
                    flex: 1, backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, fontSize: 15,
                    borderWidth: 2, borderColor: '#f3f4f6', color: '#374151',
                  }}
                />
                {listItems.length > 1 && (
                  <TouchableOpacity onPress={() => onBlockChange(listItems.filter((_: any, idx: number) => idx !== i))} style={{ padding: 6 }}>
                    <X size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => onBlockChange([...listItems, ''])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 }}>
              <Plus size={16} color="#14b8a6" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#14b8a6' }}>Add item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    case 'matrix_rating': {
      const matrixItems: string[] = Array.isArray(block.matrixItems) ? block.matrixItems : []
      const scaleMax = (block.matrixScaleMax ?? 5) as number
      const mLabels = block.matrixScaleLabels || {}
      const ratings = (blockValue as Record<string, number>) || {}

      if (matrixItems.length === 0) {
        const cur = ratings['0'] || 0
        return (
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
              {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {Array.from({ length: scaleMax }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity key={n} onPress={() => onBlockChange({ ...ratings, '0': n })} style={{
                  width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: cur === n ? '#14b8a6' : '#f9fafb',
                  borderWidth: 2, borderColor: cur === n ? '#14b8a6' : '#f3f4f6',
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: cur === n ? '#fff' : '#4b5563' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {(mLabels.min || mLabels.max) && (
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
                1 = {mLabels.min || 'Not at all'} · {scaleMax} = {mLabels.max || 'Completely'}
              </Text>
            )}
          </View>
        )
      }

      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>
            {content}{isRequired && <Text style={{ color: '#f43f5e' }}> *</Text>}
          </Text>
          <View style={{ gap: 12 }}>
            {matrixItems.map((item, idx) => (
              <View key={idx} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>{item}</Text>
                <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                  {Array.from({ length: scaleMax }, (_, i) => i + 1).map((n) => (
                    <TouchableOpacity key={n} onPress={() => onBlockChange({ ...ratings, [idx.toString()]: n })} style={{
                      width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: ratings[idx.toString()] === n ? '#14b8a6' : '#f9fafb',
                      borderWidth: 2, borderColor: ratings[idx.toString()] === n ? '#14b8a6' : '#f3f4f6',
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: ratings[idx.toString()] === n ? '#fff' : '#4b5563' }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
          {(mLabels.min || mLabels.max) && (
            <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
              1 = {mLabels.min || ''} · {scaleMax} = {mLabels.max || ''}
            </Text>
          )}
        </View>
      )
    }

    case 'table_exercise': {
      const columns: any[] = Array.isArray(block.columns) ? block.columns : []
      const instr = block.instructions || null
      const rows: any[] = Array.isArray(blockValue) && (blockValue as any[]).length > 0 ? (blockValue as any[]) : [{}]
      if (columns.length === 0) return <Text style={{ color: '#9ca3af' }}>No columns defined</Text>
      return (
        <View>
          {content ? <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717', marginBottom: 10 }}>{content}</Text> : null}
          {instr && (
            <View style={{ backgroundColor: '#ecfdf5', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#a7f3d0' }}>
              <Text style={{ fontSize: 13, color: '#065f46' }}>{instr}</Text>
            </View>
          )}
          <View style={{ gap: 16 }}>
            {rows.map((row: any, ri: number) => (
              <View key={ri} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#a7f3d0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717' }}>Entry {ri + 1}</Text>
                  {rows.length > 1 && (
                    <TouchableOpacity onPress={() => onBlockChange(rows.filter((_: any, i: number) => i !== ri))}>
                      <X size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                {columns.map((col: any) => (
                  <View key={col.id} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>{col.header}</Text>
                    {col.description && <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontStyle: 'italic' }}>{col.description}</Text>}
                    <TextInput
                      value={row[col.id] || ''}
                      onChangeText={(t) => { const nr = [...rows]; nr[ri] = { ...nr[ri], [col.id]: t }; onBlockChange(nr) }}
                      placeholder="Type here..."
                      placeholderTextColor="#d1d5db"
                      multiline
                      style={{
                        backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, fontSize: 14,
                        borderWidth: 1, borderColor: '#e5e7eb', color: '#374151',
                        minHeight: 60, textAlignVertical: 'top',
                      }}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={() => onBlockChange([...rows, {}])} style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            paddingVertical: 12, marginTop: 8,
          }}>
            <Plus size={16} color="#14b8a6" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#14b8a6' }}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      )
    }

    default:
      return (
        <View style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 12 }}>
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>Unsupported block type: {block.type}</Text>
        </View>
      )
  }
}

// ============================================
// MAIN SCREEN
// ============================================

export default function PractitionerScreen() {
  const { member } = useAuth()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [practitioner, setPractitioner] = useState<PractitionerProfile | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [pastSessions, setPastSessions] = useState<UpcomingSession[]>([])
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [showAllResources, setShowAllResources] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Resource detail modal
  const [viewingResource, setViewingResource] = useState<ResourceItem | null>(null)

  // Resource fill modal
  const [fillResource, setFillResource] = useState<any>(null)
  const [fillLoading, setFillLoading] = useState(false)
  const [activeResourceItem, setActiveResourceItem] = useState<ResourceItem | null>(null)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [draftResponseId, setDraftResponseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reschedule modal
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [suggestedDate, setSuggestedDate] = useState('')
  const [suggestedTime, setSuggestedTime] = useState('')

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchData = useCallback(async () => {
    if (!member?.id) return

    try {
      const [practitionerData] = await Promise.all([
        fetchPractitioner(member.practitioner_id),
        fetchSessions(member.id),
      ])

      setPractitioner(practitionerData)

      // Fetch resources
      await fetchResources(member.id, member.practitioner_id)
    } catch (error) {
      console.error('Error loading practitioner data:', error)
    } finally {
      setLoading(false)
    }
  }, [member?.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function fetchPractitioner(practitionerId: string): Promise<PractitionerProfile | null> {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .eq('id', practitionerId)
      .single()

    if (userError || !userData) return null

    const { data: profile } = await supabase
      .from('practitioner_profiles')
      .select('headline, credentials, specialties')
      .eq('user_id', practitionerId)
      .maybeSingle()

    return {
      id: userData.id,
      full_name: userData.full_name,
      email: userData.email,
      avatar_url: userData.avatar_url,
      headline: profile?.headline || null,
      credentials: profile?.credentials || [],
      specialties: profile?.specialties || [],
    }
  }

  async function fetchSessions(memberId: string) {
    const now = new Date().toISOString()

    const [upcomingRes, pastRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, scheduled_at, duration_minutes, session_type, session_format, status, member_confirmed, reschedule_requested, reschedule_status, practitioner_proposed_date, notes, practitioner_id')
        .eq('member_id', memberId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(5),
      supabase
        .from('sessions')
        .select('id, scheduled_at, duration_minutes, session_type, session_format, status, member_confirmed, reschedule_requested, reschedule_status, practitioner_proposed_date, notes, practitioner_id')
        .eq('member_id', memberId)
        .or(`status.eq.completed,status.eq.cancelled,status.eq.no_show`)
        .order('scheduled_at', { ascending: false })
        .limit(20),
    ])

    const allSessions = [...(upcomingRes.data || []), ...(pastRes.data || [])]
    if (allSessions.length > 0) {
      const practitionerIds = [...new Set(allSessions.map(s => s.practitioner_id))]
      const { data: practitioners } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', practitionerIds)

      const mapSession = (session: any): UpcomingSession => ({
        ...session,
        member_confirmed: session.member_confirmed ?? false,
        reschedule_requested: session.reschedule_requested ?? false,
        reschedule_status: session.reschedule_status ?? null,
        practitioner_proposed_date: session.practitioner_proposed_date ?? null,
        practitioner: practitioners?.find(p => p.id === session.practitioner_id) || null,
      })

      if (upcomingRes.data) setUpcomingSessions(upcomingRes.data.map(mapSession))
      if (pastRes.data) setPastSessions(pastRes.data.map(mapSession))
    }
  }

  async function fetchResources(memberId: string, _practitionerId: string) {
    try {
      // Fetch assignments
      const { data: assignments } = await supabase
        .from('resource_assignments')
        .select('id, status, due_date, instructions, resource:resources(id, title, description, type)')
        .eq('member_id', memberId)
        .order('due_date', { ascending: true, nullsFirst: false })

      // Fetch shared resources
      const { data: shared } = await supabase
        .from('member_shared_resources')
        .select('id, viewed_at, message, resource:resources(id, title, description, type)')
        .eq('member_id', memberId)
        .order('shared_at', { ascending: false })

      const items: ResourceItem[] = []

      function extractLocalized(val: any): string {
        if (!val) return ''
        if (typeof val === 'string') return val
        return val.en || Object.values(val)[0] || ''
      }

      if (assignments) {
        for (const a of assignments) {
          const resource = Array.isArray(a.resource) ? a.resource[0] : a.resource
          if (!resource) continue
          items.push({
            id: a.id,
            resourceId: resource.id,
            type: 'assignment',
            title: extractLocalized(resource.title) || 'Untitled',
            description: extractLocalized(resource.description) || null,
            status: a.status as any,
            dueDate: a.due_date,
            instructions: (a as any).instructions || null,
            resourceType: resource.type || null,
          })
        }
      }

      if (shared) {
        const assignedIds = new Set(assignments?.map((a: any) => {
          const r = Array.isArray(a.resource) ? a.resource[0] : a.resource
          return r?.id
        }) || [])

        for (const s of shared) {
          const resource = Array.isArray(s.resource) ? s.resource[0] : s.resource
          if (!resource || assignedIds.has(resource.id)) continue
          items.push({
            id: s.id,
            resourceId: resource.id,
            type: 'shared',
            title: extractLocalized(resource.title) || 'Untitled',
            description: extractLocalized(resource.description) || null,
            status: s.viewed_at ? 'in_progress' : 'pending',
            dueDate: null,
            instructions: (s as any).message || null,
            resourceType: resource.type || null,
          })
        }
      }

      setResources(items)
    } catch (error) {
      console.error('Error fetching resources:', error)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // ============================================
  // SESSION ACTIONS
  // ============================================

  async function handleConfirmSession(sessionId: string) {
    setActionLoading(sessionId)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ member_confirmed: true, reschedule_requested: false })
        .eq('id', sessionId)

      if (error) throw error

      setUpcomingSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, member_confirmed: true, reschedule_requested: false } : s)
      )
    } catch (error) {
      console.error('Error confirming session:', error)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRequestReschedule(sessionId: string) {
    if (!rescheduleReason.trim()) return

    setActionLoading(sessionId)
    try {
      let memberSuggestedDate = null
      if (suggestedDate && suggestedTime) {
        memberSuggestedDate = new Date(`${suggestedDate}T${suggestedTime}`).toISOString()
      }

      const { error } = await supabase
        .from('sessions')
        .update({
          reschedule_requested: true,
          reschedule_reason: rescheduleReason,
          member_confirmed: false,
          member_suggested_date: memberSuggestedDate,
          reschedule_status: 'pending',
        })
        .eq('id', sessionId)

      if (error) throw error

      setUpcomingSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, reschedule_requested: true, member_confirmed: false, reschedule_status: 'pending' as const } : s)
      )
      setRescheduleSessionId(null)
      setRescheduleReason('')
      setSuggestedDate('')
      setSuggestedTime('')
    } catch (error) {
      console.error('Error requesting reschedule:', error)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleAcceptProposedDate(session: UpcomingSession) {
    if (!session.practitioner_proposed_date) return

    setActionLoading(session.id)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          scheduled_at: session.practitioner_proposed_date,
          reschedule_requested: false,
          reschedule_status: 'accepted',
          member_confirmed: true,
          practitioner_proposed_date: null,
        })
        .eq('id', session.id)

      if (error) throw error

      setUpcomingSessions(prev =>
        prev.map(s => s.id === session.id ? {
          ...s,
          scheduled_at: session.practitioner_proposed_date!,
          reschedule_requested: false,
          reschedule_status: 'accepted' as const,
          member_confirmed: true,
          practitioner_proposed_date: null,
        } : s)
      )
    } catch (error) {
      console.error('Error accepting proposed date:', error)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDeclineProposedDate(sessionId: string) {
    setActionLoading(sessionId)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          reschedule_status: 'pending',
          practitioner_proposed_date: null,
        })
        .eq('id', sessionId)

      if (error) throw error

      setUpcomingSessions(prev =>
        prev.map(s => s.id === sessionId ? {
          ...s,
          reschedule_status: 'pending' as const,
          practitioner_proposed_date: null,
        } : s)
      )
    } catch (error) {
      console.error('Error declining proposed date:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // ============================================
  // RESOURCE FILL
  // ============================================

  async function openResource(item: ResourceItem) {
    setViewingResource(null)
    setFillLoading(true)
    setActiveResourceItem(item)
    setResponses({})
    setDraftResponseId(null)

    try {
      const { data: resource, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', item.resourceId)
        .single()

      if (error || !resource) throw error || new Error('Resource not found')
      setFillResource(resource)

      if (item.type === 'assignment') {
        // Get existing response or create draft
        const { data: existing } = await supabase
          .from('resource_responses')
          .select('*')
          .eq('assignment_id', item.id)
          .eq('member_id', member!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existing) {
          setDraftResponseId(existing.id)
          setResponses(existing.responses || {})
        } else {
          const { data: newResp } = await supabase
            .from('resource_responses')
            .insert({
              assignment_id: item.id,
              resource_id: item.resourceId,
              member_id: member!.id,
              practitioner_id: member!.practitioner_id,
              responses: {},
              status: 'draft',
              started_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (newResp) {
            setDraftResponseId(newResp.id)
            await supabase
              .from('resource_assignments')
              .update({ status: 'in_progress' })
              .eq('id', item.id)
          }
        }
      } else {
        // Shared resource — mark as viewed
        await supabase
          .from('member_shared_resources')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', item.id)
      }
    } catch (err) {
      console.error('Error opening resource:', err)
      if (Platform.OS === 'web') alert('Failed to load resource.')
      else Alert.alert('Error', 'Failed to load resource.')
      setFillResource(null)
      setActiveResourceItem(null)
    } finally {
      setFillLoading(false)
    }
  }

  function closeFill() {
    setFillResource(null)
    setActiveResourceItem(null)
    setResponses({})
    setDraftResponseId(null)
    fetchData()
  }

  function handleCloseFill() {
    if (activeResourceItem?.type === 'assignment' && draftResponseId && Object.keys(responses).length > 0) {
      if (Platform.OS === 'web') {
        if (confirm('Save your progress before leaving?')) {
          handleSaveDraft().then(closeFill)
        } else {
          closeFill()
        }
      } else {
        Alert.alert('Save progress?', 'You have unsaved changes.', [
          { text: 'Discard', style: 'destructive', onPress: closeFill },
          { text: 'Save & Close', onPress: () => handleSaveDraft().then(closeFill) },
        ])
      }
    } else {
      closeFill()
    }
  }

  async function handleSaveDraft() {
    if (!draftResponseId) return
    setSaving(true)
    try {
      await supabase
        .from('resource_responses')
        .update({ responses, updated_at: new Date().toISOString() })
        .eq('id', draftResponseId)
        .eq('status', 'draft')

      if (Platform.OS === 'web') {
        // silent
      } else {
        Alert.alert('Saved', 'Your progress has been saved.')
      }
    } catch (err) {
      console.error('Error saving draft:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!draftResponseId || !activeResourceItem) return
    setSubmitting(true)
    try {
      await supabase
        .from('resource_responses')
        .update({
          responses,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftResponseId)

      await supabase
        .from('resource_assignments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', activeResourceItem.id)

      closeFill()
      if (Platform.OS === 'web') alert('Submitted successfully!')
      else Alert.alert('Submitted', 'Your response has been submitted successfully.')
    } catch (err) {
      console.error('Error submitting:', err)
      if (Platform.OS === 'web') alert('Failed to submit. Please try again.')
      else Alert.alert('Error', 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkComplete() {
    if (!activeResourceItem) return
    setSubmitting(true)
    try {
      if (activeResourceItem.type === 'shared') {
        await supabase
          .from('member_shared_resources')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', activeResourceItem.id)
      } else {
        await supabase
          .from('resource_assignments')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', activeResourceItem.id)

        if (draftResponseId) {
          await supabase
            .from('resource_responses')
            .update({
              responses,
              status: 'submitted',
              submitted_at: new Date().toISOString(),
            })
            .eq('id', draftResponseId)
        }
      }
      closeFill()
      if (Platform.OS === 'web') alert('Marked as complete!')
      else Alert.alert('Done', 'Resource marked as complete.')
    } catch (err) {
      console.error('Error marking complete:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  const displayResources = showAllResources ? resources : resources.slice(0, 3)
  const displayHistory = showAllHistory ? pastSessions : pastSessions.slice(0, 3)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#171717', marginBottom: 24 }}>
          My Practitioner
        </Text>

        {/* ============================================ */}
        {/* PRACTITIONER CARD */}
        {/* ============================================ */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24,
          borderWidth: 1, borderColor: '#f3f4f6',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
        }}>
          {practitioner ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {/* Avatar */}
              <LinearGradient
                colors={['#2dd4bf', '#059669']}
                style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                  {(practitioner.full_name || '?')[0].toUpperCase()}
                </Text>
              </LinearGradient>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>
                  {practitioner.full_name || 'Your Practitioner'}
                </Text>
                {practitioner.headline && (
                  <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }} numberOfLines={2}>
                    {practitioner.headline}
                  </Text>
                )}
                {practitioner.specialties.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {practitioner.specialties.slice(0, 3).map((s, i) => (
                      <View key={i} style={{
                        backgroundColor: '#ecfdf5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: '#059669' }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6',
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <User size={32} color="#9ca3af" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#171717' }}>
                No practitioner connected yet
              </Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
                When a practitioner invites you, they will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* ============================================ */}
        {/* RESOURCES SECTION */}
        {/* ============================================ */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#059669" />
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717' }}>Resources</Text>
            </View>
            {resources.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllResources(!showAllResources)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>
                  {showAllResources ? 'View less' : 'View all'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {resources.length > 0 ? (
            <View style={{ gap: 8 }}>
              {displayResources.map((item) => {
                const statusConfig = {
                  pending: { label: 'To do', bg: '#f3f4f6', color: '#6b7280', Icon: FileText },
                  in_progress: { label: 'In progress', bg: '#fef3c7', color: '#92400e', Icon: Clock },
                  completed: { label: 'Completed', bg: '#ecfdf5', color: '#059669', Icon: CheckCircle2 },
                }
                const sc = statusConfig[item.status] || statusConfig.pending

                return (
                  <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => setViewingResource(item)} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: '#fff', borderRadius: 16, padding: 14,
                    borderWidth: 1, borderColor: '#f3f4f6',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
                  }}>
                    <LinearGradient
                      colors={['#fb7185', '#ec4899']}
                      style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FileText size={20} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: sc.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                        }}>
                          <sc.Icon size={12} color={sc.color} />
                          <Text style={{ fontSize: 11, fontWeight: '500', color: sc.color }}>{sc.label}</Text>
                        </View>
                        {item.dueDate && (
                          <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                            Due {formatDate(item.dueDate)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={18} color="#d1d5db" />
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : (
            <View style={{
              backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center',
              borderWidth: 1, borderColor: '#f3f4f6',
            }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28, backgroundColor: '#f3f4f6',
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <FileText size={28} color="#9ca3af" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717' }}>No resources yet</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
                Your practitioner will share worksheets and exercises with you here.
              </Text>
            </View>
          )}
        </View>

        {/* ============================================ */}
        {/* UPCOMING SESSIONS */}
        {/* ============================================ */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={18} color="#059669" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717' }}>Upcoming Sessions</Text>
          </View>

          {upcomingSessions.length === 0 ? (
            <View style={{
              backgroundColor: '#f9fafb', borderRadius: 20, padding: 24, alignItems: 'center',
            }}>
              <Calendar size={40} color="#d1d5db" />
              <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 12 }}>No upcoming sessions</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {upcomingSessions.map((session) => {
                const FormatIcon = getSessionFormatIcon(session.session_format)
                const sessionDate = new Date(session.scheduled_at)
                const needsConfirmation = !session.member_confirmed && !session.reschedule_requested && session.reschedule_status !== 'proposed'
                const hasProposedDate = session.reschedule_status === 'proposed' && session.practitioner_proposed_date

                const borderColor = hasProposedDate ? '#c4b5fd' : needsConfirmation ? '#fcd34d' : session.reschedule_requested ? '#fdba74' : '#a7f3d0'
                const bgColor = hasProposedDate ? '#f5f3ff' : needsConfirmation ? '#fffbeb' : session.reschedule_requested ? '#fff7ed' : '#ecfdf5'

                return (
                  <View key={session.id} style={{
                    backgroundColor: bgColor, borderRadius: 18, padding: 16,
                    borderWidth: 1, borderColor,
                  }}>
                    {/* Proposed Date Banner */}
                    {hasProposedDate && (
                      <View style={{
                        backgroundColor: '#ede9fe', borderRadius: 14, padding: 12, marginBottom: 12,
                        borderWidth: 1, borderColor: '#c4b5fd',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                          <CalendarCheck size={18} color="#7c3aed" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#5b21b6' }}>New Date Proposed</Text>
                            <Text style={{ fontSize: 13, color: '#6d28d9', marginTop: 2 }}>
                              {formatFullDate(session.practitioner_proposed_date!)} at {formatTime(session.practitioner_proposed_date!)}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => handleAcceptProposedDate(session)}
                            disabled={actionLoading === session.id}
                            style={{
                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 10,
                              opacity: actionLoading === session.id ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === session.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Check size={15} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Accept</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeclineProposedDate(session.id)}
                            disabled={actionLoading === session.id}
                            style={{
                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 10,
                              opacity: actionLoading === session.id ? 0.6 : 1,
                            }}
                          >
                            <X size={15} color="#374151" />
                            <Text style={{ color: '#374151', fontSize: 13, fontWeight: '600' }}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Status Badge */}
                    {needsConfirmation && (
                      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                        <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400e' }}>Awaiting your confirmation</Text>
                        </View>
                      </View>
                    )}
                    {session.reschedule_requested && session.reschedule_status === 'pending' && (
                      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                        <View style={{ backgroundColor: '#ffedd5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#9a3412' }}>Reschedule requested</Text>
                        </View>
                      </View>
                    )}
                    {session.member_confirmed && !hasProposedDate && (
                      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: '#ecfdf5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
                        }}>
                          <Check size={12} color="#059669" />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>Confirmed</Text>
                        </View>
                      </View>
                    )}

                    {/* Session Info Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      {/* Date Box */}
                      <View style={{
                        width: 56, height: 56, borderRadius: 14,
                        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
                          {sessionDate.toLocaleDateString(undefined, { month: 'short' })}
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: '#171717' }}>
                          {sessionDate.getDate()}
                        </Text>
                      </View>

                      {/* Session Details */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717', marginBottom: 4 }}>
                          {getSessionTypeLabel(session.session_type)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Clock size={13} color="#9ca3af" />
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{formatTime(session.scheduled_at)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <FormatIcon size={13} color="#9ca3af" />
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{getSessionFormatLabel(session.session_format)}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>{session.duration_minutes} min</Text>
                        </View>
                        {session.practitioner && (
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            with <Text style={{ fontWeight: '600' }}>{session.practitioner.full_name}</Text>
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Action Buttons */}
                    {needsConfirmation && (
                      <View style={{
                        flexDirection: 'row', gap: 8, marginTop: 14,
                        paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
                      }}>
                        <TouchableOpacity
                          onPress={() => handleConfirmSession(session.id)}
                          disabled={actionLoading === session.id}
                          style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                            backgroundColor: '#059669', borderRadius: 14, paddingVertical: 12,
                            opacity: actionLoading === session.id ? 0.6 : 1,
                          }}
                        >
                          {actionLoading === session.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <CalendarCheck size={16} color="#fff" />
                              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Confirm</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setRescheduleSessionId(session.id)
                            setRescheduleReason('')
                            setSuggestedDate('')
                            setSuggestedTime('')
                          }}
                          disabled={actionLoading === session.id}
                          style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                            backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 12,
                            opacity: actionLoading === session.id ? 0.6 : 1,
                          }}
                        >
                          <RefreshCw size={16} color="#374151" />
                          <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>Reschedule</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* ============================================ */}
        {/* SESSION HISTORY */}
        {/* ============================================ */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#6b7280" />
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717' }}>Session History</Text>
            </View>
            {pastSessions.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllHistory(!showAllHistory)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>
                  {showAllHistory ? 'View less' : 'View all'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {pastSessions.length === 0 ? (
            <View style={{ backgroundColor: '#f9fafb', borderRadius: 20, padding: 24, alignItems: 'center' }}>
              <Clock size={40} color="#d1d5db" />
              <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 12 }}>No session history</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {displayHistory.map((session) => {
                const FormatIcon = getSessionFormatIcon(session.session_format)
                const sessionDate = new Date(session.scheduled_at)
                const isCompleted = session.status === 'completed'
                const isCancelled = session.status === 'cancelled'
                const isNoShow = session.status === 'no_show'

                const borderColor = isCancelled ? '#fecaca' : isNoShow ? '#fde68a' : '#e5e7eb'
                const bgTint = isCancelled ? '#fef2f2' : isNoShow ? '#fffbeb' : '#fff'

                return (
                  <View key={session.id} style={{
                    backgroundColor: bgTint, borderRadius: 18, padding: 14,
                    borderWidth: 1, borderColor,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      {/* Date Box */}
                      <View style={{
                        width: 48, height: 48, borderRadius: 12,
                        backgroundColor: isCompleted ? '#f3f4f6' : isCancelled ? '#fecaca' : '#fde68a',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
                          {sessionDate.toLocaleDateString(undefined, { month: 'short' })}
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#374151' }}>
                          {sessionDate.getDate()}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>
                            {getSessionTypeLabel(session.session_type)}
                          </Text>
                          {isCompleted && (
                            <View style={{
                              flexDirection: 'row', alignItems: 'center', gap: 3,
                              backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                            }}>
                              <Check size={10} color="#059669" />
                              <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669' }}>Completed</Text>
                            </View>
                          )}
                          {isCancelled && (
                            <View style={{ backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '600', color: '#ef4444' }}>Cancelled</Text>
                            </View>
                          )}
                          {isNoShow && (
                            <View style={{ backgroundColor: '#fffbeb', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '600', color: '#d97706' }}>No Show</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Clock size={12} color="#9ca3af" />
                            <Text style={{ fontSize: 11, color: '#6b7280' }}>{formatTime(session.scheduled_at)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <FormatIcon size={12} color="#9ca3af" />
                            <Text style={{ fontSize: 11, color: '#6b7280' }}>{getSessionFormatLabel(session.session_format)}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#6b7280' }}>{session.duration_minutes} min</Text>
                        </View>
                        {session.practitioner && (
                          <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                            with {session.practitioner.full_name}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* ============================================ */}
        {/* QUICK ACCESS */}
        {/* ============================================ */}
        <View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717', marginBottom: 12 }}>Quick Access</Text>
          <View style={{ gap: 8 }}>
            {[
              { label: 'My Practitioners', desc: 'View your practitioners', colors: ['#8b5cf6', '#7c3aed'] as [string, string], Icon: Users },
              { label: 'My Assessments', desc: 'Assessments and exercises', colors: ['#059669', '#0d9488'] as [string, string], Icon: FileText },
              { label: 'My Stories', desc: 'Therapeutic stories', colors: ['#f59e0b', '#ea580c'] as [string, string], Icon: BookOpen },
            ].map((item) => (
              <TouchableOpacity key={item.label} activeOpacity={0.7} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: '#fff', borderRadius: 18, padding: 16,
                borderWidth: 1, borderColor: '#f3f4f6',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
              }}>
                <LinearGradient
                  colors={item.colors}
                  style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                >
                  <item.Icon size={24} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#171717' }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{item.desc}</Text>
                </View>
                <ChevronRight size={18} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ============================================ */}
      {/* RESCHEDULE MODAL */}
      {/* ============================================ */}
      <Modal visible={!!rescheduleSessionId} transparent animationType="fade" onRequestClose={() => setRescheduleSessionId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 16 }} onPress={() => setRescheduleSessionId(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderRadius: 24, padding: 24,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
          }} onPress={() => {}}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>Request Reschedule</Text>
              <TouchableOpacity onPress={() => setRescheduleSessionId(null)} style={{ padding: 4 }}>
                <X size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Please let us know why you need to reschedule.
            </Text>

            {/* Reason input */}
            <TextInput
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              placeholder="Reason for rescheduling..."
              placeholderTextColor="#d1d5db"
              multiline
              style={{
                backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, fontSize: 14,
                borderWidth: 1, borderColor: '#e5e7eb', color: '#171717',
                minHeight: 60, textAlignVertical: 'top', marginBottom: 16,
              }}
            />

            {/* Suggest date section */}
            <View style={{
              backgroundColor: '#ecfdf5', borderRadius: 14, padding: 14, marginBottom: 16,
              borderWidth: 1, borderColor: '#a7f3d0',
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>
                Suggest a new date (optional)
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Date</Text>
                  <TextInput
                    value={suggestedDate}
                    onChangeText={setSuggestedDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#d1d5db"
                    style={{
                      backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 13,
                      borderWidth: 1, borderColor: '#e5e7eb', color: '#171717',
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Time</Text>
                  <TextInput
                    value={suggestedTime}
                    onChangeText={setSuggestedTime}
                    placeholder="HH:MM"
                    placeholderTextColor="#d1d5db"
                    style={{
                      backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 13,
                      borderWidth: 1, borderColor: '#e5e7eb', color: '#171717',
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRescheduleSessionId(null)}
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => rescheduleSessionId && handleRequestReschedule(rescheduleSessionId)}
                disabled={actionLoading === rescheduleSessionId || !rescheduleReason.trim()}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 12,
                  opacity: (actionLoading === rescheduleSessionId || !rescheduleReason.trim()) ? 0.5 : 1,
                }}
              >
                {actionLoading === rescheduleSessionId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <RefreshCw size={15} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Send Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================ */}
      {/* RESOURCE DETAIL MODAL */}
      {/* ============================================ */}
      <Modal visible={!!viewingResource} transparent animationType="slide" onRequestClose={() => setViewingResource(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setViewingResource(null)}>
          <Pressable style={{
            backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, maxHeight: '80%',
          }} onPress={() => {}}>
            {viewingResource && (() => {
              const statusConfig = {
                pending: { label: 'To do', bg: '#f3f4f6', color: '#6b7280', Icon: FileText },
                in_progress: { label: 'In progress', bg: '#fef3c7', color: '#92400e', Icon: Clock },
                completed: { label: 'Completed', bg: '#ecfdf5', color: '#059669', Icon: CheckCircle2 },
              }
              const sc = statusConfig[viewingResource.status] || statusConfig.pending

              return (
                <>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 }}>
                      <LinearGradient
                        colors={['#fb7185', '#ec4899']}
                        style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <FileText size={24} color="#fff" />
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#171717' }}>{viewingResource.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: sc.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                          }}>
                            <sc.Icon size={12} color={sc.color} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: sc.color }}>{sc.label}</Text>
                          </View>
                          {viewingResource.resourceType && (
                            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 11, fontWeight: '500', color: '#6b7280', textTransform: 'capitalize' }}>
                                {viewingResource.resourceType.replace(/_/g, ' ')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setViewingResource(null)}>
                      <X size={22} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                    {/* Description */}
                    {viewingResource.description && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Description</Text>
                        <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20 }}>{viewingResource.description}</Text>
                      </View>
                    )}

                    {/* Instructions / Practitioner message */}
                    {viewingResource.instructions && (
                      <View style={{
                        backgroundColor: '#ecfdf5', borderRadius: 14, padding: 14, marginBottom: 16,
                        borderWidth: 1, borderColor: '#a7f3d0',
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669', marginBottom: 4 }}>
                          {viewingResource.type === 'shared' ? 'Practitioner\'s message' : 'Instructions'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }}>{viewingResource.instructions}</Text>
                      </View>
                    )}

                    {/* Due date */}
                    {viewingResource.dueDate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Calendar size={16} color="#9ca3af" />
                        <Text style={{ fontSize: 13, color: '#6b7280' }}>
                          Due: <Text style={{ fontWeight: '600', color: '#171717' }}>{formatDate(viewingResource.dueDate)}</Text>
                        </Text>
                      </View>
                    )}

                    {/* Type badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                      <View style={{
                        backgroundColor: viewingResource.type === 'assignment' ? '#ede9fe' : '#e0f2fe',
                        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
                      }}>
                        <Text style={{
                          fontSize: 12, fontWeight: '600',
                          color: viewingResource.type === 'assignment' ? '#7c3aed' : '#0284c7',
                        }}>
                          {viewingResource.type === 'assignment' ? 'Assigned by practitioner' : 'Shared with you'}
                        </Text>
                      </View>
                    </View>
                  </ScrollView>

                  {/* Action button */}
                  {viewingResource.status !== 'completed' && (
                    <TouchableOpacity
                      onPress={() => openResource(viewingResource)}
                      style={{
                        backgroundColor: '#059669', borderRadius: 14, paddingVertical: 14,
                        alignItems: 'center', marginTop: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                        {viewingResource.status === 'in_progress' ? 'Continue' : 'Start'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================ */}
      {/* RESOURCE FILL MODAL (full screen) */}
      {/* ============================================ */}
      <Modal visible={!!fillResource || fillLoading} animationType="slide" onRequestClose={handleCloseFill}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', padding: 16,
            borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          }}>
            <TouchableOpacity onPress={handleCloseFill} style={{ padding: 4, marginRight: 12 }}>
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717' }} numberOfLines={1}>
                {fillResource ? extractLocalized(fillResource.title) : 'Loading...'}
              </Text>
              {fillResource && (
                <Text style={{ fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' }}>
                  {(fillResource.type || '').replace(/_/g, ' ')}
                </Text>
              )}
            </View>
            {activeResourceItem?.type === 'assignment' && draftResponseId && (
              <TouchableOpacity onPress={handleSaveDraft} disabled={saving} style={{ padding: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: saving ? '#9ca3af' : '#059669' }}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {fillLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 12 }}>Loading resource...</Text>
            </View>
          ) : fillResource ? (
            <>
              <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Practitioner instructions */}
                {activeResourceItem?.instructions && (
                  <View style={{
                    backgroundColor: '#ecfdf5', borderRadius: 16, padding: 16,
                    borderWidth: 1, borderColor: '#a7f3d0',
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669', marginBottom: 4 }}>
                      {activeResourceItem.type === 'shared' ? "Practitioner's message" : 'Instructions'}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                      {activeResourceItem.instructions}
                    </Text>
                  </View>
                )}

                {/* Resource description */}
                {fillResource.description && (
                  <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 20 }}>
                    {extractLocalized(fillResource.description)}
                  </Text>
                )}

                {/* Render blocks */}
                {(fillResource.blocks || []).map((block: any) => (
                  <View key={block.id}>
                    {renderBlock(
                      block,
                      responses[block.id],
                      (val) => setResponses(prev => ({ ...prev, [block.id]: val })),
                    )}
                  </View>
                ))}
              </ScrollView>

              {/* Bottom action bar */}
              <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: 16, paddingBottom: 36, backgroundColor: '#fff',
                borderTopWidth: 1, borderTopColor: '#f3f4f6',
                shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8,
              }}>
                {(() => {
                  const hasInteractiveBlocks = (fillResource.blocks || []).some((b: any) =>
                    ['prompt', 'multiple_choice', 'yes_no', 'checklist', 'scale', 'likert',
                      'mood', 'slider', 'numeric', 'date_picker', 'time_input', 'list_input',
                      'matrix_rating', 'table_exercise'].includes(b.type)
                  )

                  if (activeResourceItem?.type === 'assignment' && hasInteractiveBlocks) {
                    return (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                          onPress={handleSaveDraft}
                          disabled={saving || !draftResponseId}
                          style={{
                            flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 14,
                            backgroundColor: '#f3f4f6',
                            opacity: saving || !draftResponseId ? 0.5 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>
                            {saving ? 'Saving...' : 'Save Draft'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSubmit}
                          disabled={submitting}
                          style={{
                            flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                            paddingVertical: 14, borderRadius: 14, backgroundColor: '#059669',
                            opacity: submitting ? 0.6 : 1,
                          }}
                        >
                          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Check size={18} color="#fff" />}
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Submit</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  }

                  return (
                    <TouchableOpacity
                      onPress={handleMarkComplete}
                      disabled={submitting}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        paddingVertical: 14, borderRadius: 14, backgroundColor: '#059669',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle2 size={18} color="#fff" />}
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                        {activeResourceItem?.type === 'assignment' ? 'Mark Complete' : 'Mark as Read'}
                      </Text>
                    </TouchableOpacity>
                  )
                })()}
              </View>
            </>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
