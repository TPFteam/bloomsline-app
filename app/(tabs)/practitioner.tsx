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
                      onPress={() => {
                        setViewingResource(null)
                        if (Platform.OS === 'web') {
                          alert('Opening resources in the app is coming soon. Please use the web app to complete worksheets.')
                        } else {
                          Alert.alert('Coming soon', 'Opening resources in the app is coming soon. Please use the web app to complete worksheets.')
                        }
                      }}
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
    </SafeAreaView>
  )
}
