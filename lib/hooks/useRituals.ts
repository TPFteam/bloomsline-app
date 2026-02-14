import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import {
  fetchMemberRituals,
  fetchTodayCompletions,
  fetchPredefinedRituals,
  toggleCompletion,
  completeWithDetails,
  addRitualToList,
  removeRitualFromList,
  createCustomRitual,
  getCategoryFromTime,
  type MemberRitual,
  type RitualCompletion,
  type Ritual,
  type RitualCategory,
} from '@/lib/services/rituals'

export function useRituals() {
  const { member } = useAuth()
  const memberId = member?.id as string | undefined

  const [memberRituals, setMemberRituals] = useState<MemberRitual[]>([])
  const [todayCompletions, setTodayCompletions] = useState<RitualCompletion[]>([])
  const [allRituals, setAllRituals] = useState<Ritual[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const completedCount = todayCompletions.filter(c => c.completed).length
  const totalCount = memberRituals.length

  const isCompletedToday = useCallback(
    (ritualId: string) => todayCompletions.some(c => c.ritual_id === ritualId && c.completed),
    [todayCompletions]
  )

  const fetchAll = useCallback(async () => {
    if (!memberId) return
    const [rituals, completions, predefined] = await Promise.all([
      fetchMemberRituals(memberId),
      fetchTodayCompletions(memberId),
      fetchPredefinedRituals(memberId),
    ])
    setMemberRituals(rituals)
    setTodayCompletions(completions)
    setAllRituals(predefined)
    setLoading(false)
  }, [memberId])

  // Refetch on tab focus
  useFocusEffect(useCallback(() => { fetchAll() }, [fetchAll]))

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }, [fetchAll])

  const toggleRitual = useCallback(async (ritualId: string) => {
    if (!memberId) return
    const existing = todayCompletions.find(c => c.ritual_id === ritualId)

    // Optimistic update
    const now = new Date().toISOString()
    if (existing) {
      const newCompleted = !existing.completed
      setTodayCompletions(prev =>
        prev.map(c => c.id === existing.id ? { ...c, completed: newCompleted, completed_at: newCompleted ? now : null } : c)
      )
    } else {
      const tempCompletion: RitualCompletion = {
        id: `temp-${Date.now()}`,
        ritual_id: ritualId,
        member_id: memberId,
        completion_date: new Date().toISOString().split('T')[0],
        completed: true,
        completed_at: now,
        created_at: now,
        duration_minutes: null,
        notes: null,
        mood: null,
      }
      setTodayCompletions(prev => [...prev, tempCompletion])
    }

    const result = await toggleCompletion(memberId, ritualId, existing)
    if (result) {
      setTodayCompletions(prev => {
        const filtered = prev.filter(c => c.id !== (existing?.id || '') && !c.id.startsWith('temp-'))
        return [...filtered, result]
      })
    }
  }, [memberId, todayCompletions])

  const completeRitual = useCallback(async (
    ritualId: string,
    details: { mood?: string | null; notes?: string | null; durationMinutes?: number | null }
  ) => {
    if (!memberId) return
    const existing = todayCompletions.find(c => c.ritual_id === ritualId)
    const result = await completeWithDetails(memberId, ritualId, details, existing)
    if (result) {
      setTodayCompletions(prev => {
        const filtered = prev.filter(c => c.ritual_id !== ritualId)
        return [...filtered, result]
      })
    }
  }, [memberId, todayCompletions])

  const addRitual = useCallback(async (ritualId: string, plannedTime: string) => {
    if (!memberId) return
    const result = await addRitualToList(memberId, ritualId, plannedTime)
    if (result) {
      setMemberRituals(prev =>
        [...prev, result].sort((a, b) => {
          if (!a.planned_time) return 1
          if (!b.planned_time) return -1
          return a.planned_time.localeCompare(b.planned_time)
        })
      )
    }
  }, [memberId])

  const createRitual = useCallback(async (
    details: { name: string; description?: string; icon?: string; category: RitualCategory; durationSuggestion?: number },
    plannedTime: string
  ) => {
    if (!memberId) return
    const result = await createCustomRitual(memberId, details, plannedTime)
    if (result) {
      setMemberRituals(prev =>
        [...prev, result].sort((a, b) => {
          if (!a.planned_time) return 1
          if (!b.planned_time) return -1
          return a.planned_time.localeCompare(b.planned_time)
        })
      )
      // Re-fetch predefined so the new custom ritual shows up
      const updated = await fetchPredefinedRituals(memberId)
      setAllRituals(updated)
    }
  }, [memberId])

  const removeRitual = useCallback(async (memberRitualId: string) => {
    if (!memberId) return
    const success = await removeRitualFromList(memberRitualId)
    if (success) {
      setMemberRituals(prev => prev.filter(mr => mr.id !== memberRitualId))
    }
  }, [memberId])

  const getAvailableRituals = useCallback((category: RitualCategory) => {
    const enabledIds = memberRituals.map(mr => mr.ritual_id)
    return allRituals.filter(r => r.category === category && !enabledIds.includes(r.id))
  }, [memberRituals, allRituals])

  const getCategoryProgress = useCallback((category: RitualCategory) => {
    const categoryRituals = memberRituals.filter(mr => mr.ritual.category === category)
    const completed = categoryRituals.filter(mr => isCompletedToday(mr.ritual_id)).length
    return { completed, total: categoryRituals.length }
  }, [memberRituals, isCompletedToday])

  return {
    memberRituals,
    todayCompletions,
    allRituals,
    loading,
    refreshing,
    completedCount,
    totalCount,
    isCompletedToday,
    refresh,
    toggleRitual,
    completeRitual,
    addRitual,
    createRitual,
    removeRitual,
    getAvailableRituals,
    getCategoryProgress,
    getCategoryFromTime,
  }
}
