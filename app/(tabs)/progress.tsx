import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

import useProgressData from '@/components/progress/useProgressData'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import WeekStrip from '@/components/progress/WeekStrip'
import MoodSection from '@/components/progress/MoodSection'
import PracticesSection from '@/components/progress/PracticesSection'
import StepsSection from '@/components/progress/StepsSection'
import MomentsOverview from '@/components/progress/MomentsOverview'
import ActivityGrid from '@/components/progress/ActivityGrid'
import {
  fmtDate,
  type MomentRow,
  type CompletionRow,
  type MemberRitualRow,
  type AnchorRow,
  type AnchorLogRow,
} from '@/components/progress/shared'

export default function ProgressScreen() {
  const { user, member } = useAuth()

  const [moments, setMoments] = useState<MomentRow[]>([])
  const [completions, setCompletions] = useState<CompletionRow[]>([])
  const [memberRituals, setMemberRituals] = useState<MemberRitualRow[]>([])
  const [anchors, setAnchors] = useState<AnchorRow[]>([])
  const [anchorLogs, setAnchorLogs] = useState<AnchorLogRow[]>([])
  const [sessionCount, setSessionCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  // ── Data fetching ──────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user?.id || !member?.id) return

    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const cutoff = fmtDate(thirtyAgo)

    const [momentsRes, completionsRes, ritualsRes, anchorsRes, anchorLogsRes, sessionsRes] = await Promise.all([
      supabase
        .from('moments')
        .select('id, type, moods, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyAgo.toISOString()),
      supabase
        .from('ritual_completions')
        .select('*, ritual:rituals(name, icon, category)')
        .eq('member_id', member.id)
        .gte('completion_date', cutoff)
        .order('completion_date', { ascending: false }),
      supabase
        .from('member_rituals')
        .select('id, ritual_id, planned_time, ritual:rituals(id, name, icon, category, duration_suggestion)')
        .eq('member_id', member.id)
        .eq('is_active', true)
        .order('planned_time', { ascending: true, nullsFirst: false }),
      supabase
        .from('member_anchors')
        .select('id, icon, label_en, type')
        .eq('member_id', member.id)
        .eq('is_active', true),
      supabase
        .from('anchor_logs')
        .select('anchor_id, log_date')
        .eq('member_id', member.id)
        .gte('log_date', cutoff),
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .eq('status', 'completed'),
    ])

    const normalize = (r: any) => ({
      ...r,
      ritual: Array.isArray(r.ritual) ? r.ritual[0] || null : r.ritual,
    })

    setMoments((momentsRes.data ?? []) as MomentRow[])
    setCompletions((completionsRes.data ?? []).map(normalize) as CompletionRow[])
    setMemberRituals((ritualsRes.data ?? []).map(normalize) as MemberRitualRow[])
    setAnchors((anchorsRes.data ?? []) as AnchorRow[])
    setAnchorLogs((anchorLogsRes.data ?? []) as AnchorLogRow[])
    setSessionCount(sessionsRes.count ?? 0)
    setLoading(false)
  }, [user?.id, member?.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // ── Derived data ───────────────────────────────────────

  const data = useProgressData({ moments, completions, memberRituals, anchors, anchorLogs })

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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 22, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* Header */}
        <AnimatedSection index={sectionIdx++}>
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 }}>
              Your Journey
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              Here's what I've noticed
            </Text>
          </View>
        </AnimatedSection>

        {/* Section 1: This Week */}
        <WeekStrip
          index={sectionIdx++}
          weekDays={data.weekDays}
          today={data.today}
          ritualCompletionsByDate={data.ritualCompletionsByDate}
          anchorLogsByDate={data.anchorLogsByDate}
          momentsByDate={data.momentsByDate}
          weekNarrative={data.getWeekNarrative()}
        />

        {/* Section 2: How You've Been Feeling */}
        <MoodSection
          index={sectionIdx++}
          ritualMoodCounts={data.ritualMoodCounts}
          totalRitualMoods={data.totalRitualMoods}
          topMomentMoods={data.topMomentMoods}
          moodNarrative={data.getMoodNarrative()}
        />

        {/* Section 3: Your Practices */}
        {memberRituals.length > 0 && (
          <PracticesSection
            index={sectionIdx++}
            memberRituals={memberRituals}
            weekDays={data.weekDays}
            today={data.today}
            ritualDayDetail={data.ritualDayDetail}
            ritualStats={data.ritualStats}
          />
        )}

        {/* Section 4: Your Little Steps */}
        {anchors.length > 0 && (
          <StepsSection
            index={sectionIdx++}
            anchors={anchors}
            weekDays={data.weekDays}
            today={data.today}
            anchorLogMap={data.anchorLogMap}
            anchorStats={data.anchorStats}
          />
        )}

        {/* Section 5: Your Moments */}
        <MomentsOverview
          index={sectionIdx++}
          totalMoments={moments.length}
          momentTypeCounts={data.momentTypeCounts}
          topMomentMoods={data.topMomentMoods}
          momentsNarrative={data.getMomentsNarrative()}
        />

        {/* Section 6: The Bigger Picture */}
        <ActivityGrid
          index={sectionIdx++}
          monthDays={data.monthDays}
          today={data.today}
          dayActivityCounts={data.dayActivityCounts}
          expandedDay={expandedDay}
          setExpandedDay={setExpandedDay}
          ritualCompletionsByDate={data.ritualCompletionsByDate}
          anchorLogsByDate={data.anchorLogsByDate}
          momentsByDate={data.momentsByDate}
          anchors={anchors}
        />

        {/* Session count */}
        {sessionCount > 0 && (
          <AnimatedSection index={sectionIdx++}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginBottom: 16,
            }}>
              <Text style={{ fontSize: 13, color: '#9ca3af' }}>
                {sessionCount} session{sessionCount !== 1 ? 's' : ''} completed with your practitioner
              </Text>
            </View>
          </AnimatedSection>
        )}

        {/* Closing */}
        <AnimatedSection index={sectionIdx++}>
          <View style={{ alignItems: 'center', paddingVertical: 8, paddingBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 }}>
              This isn't about being perfect.{'\n'}It's about noticing — and that's already enough.
            </Text>
          </View>
        </AnimatedSection>
      </ScrollView>
    </SafeAreaView>
  )
}
