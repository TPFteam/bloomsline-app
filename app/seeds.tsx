import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, History } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

import useSeedsData from '@/components/seeds/useSeedsData'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import ActivityHistory from '@/components/seeds/ActivityHistory'
import WeekView from '@/components/seeds/WeekView'
import MonthGrid from '@/components/seeds/MonthGrid'
import GrowthSection from '@/components/seeds/GrowthSection'
import { fmtDate, type Anchor, type AnchorLog, type ActivityLog } from '@/components/seeds/shared'

export default function SeedsScreen() {
  const { member } = useAuth()
  const router = useRouter()

  const [anchors, setAnchors] = useState<Anchor[]>([])
  const [logs, setLogs] = useState<AnchorLog[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // ── Data fetching ──────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!member?.id) return

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 180)
    const cutoffStr = fmtDate(cutoff)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [anchorsRes, logsRes, activityRes] = await Promise.all([
      supabase
        .from('member_anchors')
        .select('id, icon, label_en, label_fr, type')
        .eq('member_id', member.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('anchor_logs')
        .select('anchor_id, log_date')
        .eq('member_id', member.id)
        .gte('log_date', cutoffStr),
      supabase
        .from('anchor_activity_logs')
        .select('id, anchor_icon, anchor_label_en, anchor_type, action, created_at')
        .eq('member_id', member.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
    ])

    setAnchors((anchorsRes.data ?? []) as Anchor[])
    setLogs((logsRes.data ?? []) as AnchorLog[])
    setActivityLogs((activityRes.data ?? []) as ActivityLog[])
    setLoading(false)
  }, [member?.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // ── Delete anchor ──────────────────────────────────────

  async function handleDeleteAnchor(anchor: Anchor) {
    if (!member?.id) return

    await Promise.all([
      supabase
        .from('member_anchors')
        .update({ is_active: false })
        .eq('id', anchor.id),
      supabase
        .from('anchor_activity_logs')
        .insert({
          member_id: member.id,
          anchor_id: anchor.id,
          action: 'removed',
          anchor_type: anchor.type,
          anchor_icon: anchor.icon,
          anchor_label_en: anchor.label_en,
          anchor_label_fr: anchor.label_fr,
        }),
    ])

    setAnchors(prev => prev.filter(a => a.id !== anchor.id))
    setActivityLogs(prev => [{
      id: crypto.randomUUID(),
      anchor_icon: anchor.icon,
      anchor_label_en: anchor.label_en,
      anchor_type: anchor.type,
      action: 'removed',
      created_at: new Date().toISOString(),
    }, ...prev])
  }

  // ── Derived data ───────────────────────────────────────

  const data = useSeedsData({ anchors, logs })

  // ── Loading ────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    )
  }

  // ── Render ─────────────────────────────────────────────

  let sectionIdx = 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      {/* Header */}
      <AnimatedSection index={sectionIdx++}>
        <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
                style={{
                  width: 34, height: 34, borderRadius: 11,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                }}
              >
                <ChevronLeft size={20} color="#4b5563" />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 }}>
                  My Little Steps
                </Text>
                {anchors.length > 0 && (
                  <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {anchors.length} seed{anchors.length !== 1 ? 's' : ''} active
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={{
                width: 36, height: 36, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: showHistory ? '#d97706' : 'rgba(0,0,0,0.05)',
              }}
            >
              <History size={18} color={showHistory ? '#ffffff' : '#4b5563'} />
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedSection>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* Activity History */}
        {showHistory && (
          <ActivityHistory index={sectionIdx++} activityLogs={activityLogs} />
        )}

        {/* This Week */}
        <WeekView
          index={sectionIdx++}
          growAnchors={data.growAnchors}
          letgoAnchors={data.letgoAnchors}
          weekDays={data.weekDays}
          today={data.today}
          historyMap={data.historyMap}
          anchorStats={data.anchorStats}
          totalAnchors={anchors.length}
        />

        {/* Your Month */}
        <MonthGrid
          index={sectionIdx++}
          monthDays={data.monthDays}
          today={data.today}
          dayBreakdown={data.dayBreakdown}
          expandedDay={expandedDay}
          setExpandedDay={setExpandedDay}
          seedsForDay={data.seedsForDay}
        />

        {/* Your Growth */}
        {anchors.length > 0 && (
          <GrowthSection
            index={sectionIdx++}
            anchors={anchors}
            monthDays={data.monthDays}
            today={data.today}
            historyMap={data.historyMap}
            anchorStats={data.anchorStats}
            mostConsistent={data.mostConsistent}
            onDeleteAnchor={handleDeleteAnchor}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
