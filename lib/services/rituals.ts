import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

export type RitualCategory = 'morning' | 'midday' | 'evening' | 'selfcare'
export type MoodType = 'great' | 'good' | 'okay' | 'low' | 'difficult'
export type TrackingType = 'checkbox' | 'duration' | 'streak'

export interface Ritual {
  id: string
  name: string
  description: string | null
  benefit: string | null
  category: RitualCategory
  icon: string | null
  duration_suggestion: number | null
  is_predefined: boolean
  created_by: string | null
}

export interface MemberRitual {
  id: string
  ritual_id: string
  tracking_type: TrackingType
  is_active: boolean
  planned_time: string | null // HH:MM format
  ritual: Ritual
}

export interface RitualCompletion {
  id: string
  ritual_id: string
  member_id: string
  completion_date: string
  completed: boolean
  completed_at: string | null
  duration_minutes: number | null
  notes: string | null
  mood: string | null
}

// ============================================
// HELPERS
// ============================================

function getTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getCategoryFromTime(time: string): RitualCategory {
  const [hours] = time.split(':').map(Number)
  if (hours < 12) return 'morning'
  if (hours < 17) return 'midday'
  return 'evening'
}

// ============================================
// QUERIES
// ============================================

export async function fetchMemberRituals(memberId: string): Promise<MemberRitual[]> {
  const { data, error } = await supabase
    .from('member_rituals')
    .select(`
      id,
      ritual_id,
      tracking_type,
      is_active,
      planned_time,
      ritual:rituals(*)
    `)
    .eq('member_id', memberId)
    .eq('is_active', true)
    .order('planned_time', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching member rituals:', error)
    return []
  }

  // Sort by planned_time
  const sorted = [...(data || [])].sort((a, b) => {
    if (!a.planned_time) return 1
    if (!b.planned_time) return -1
    return a.planned_time.localeCompare(b.planned_time)
  })

  return sorted as unknown as MemberRitual[]
}

export async function fetchTodayCompletions(memberId: string): Promise<RitualCompletion[]> {
  const { data, error } = await supabase
    .from('ritual_completions')
    .select('*')
    .eq('member_id', memberId)
    .eq('completion_date', getTodayStr())

  if (error) {
    console.error('Error fetching completions:', error)
    return []
  }

  return data as RitualCompletion[]
}

export async function fetchPredefinedRituals(memberId: string): Promise<Ritual[]> {
  const { data, error } = await supabase
    .from('rituals')
    .select('*')
    .or(`is_predefined.eq.true,created_by.eq.${memberId}`)
    .order('category')

  if (error) {
    console.error('Error fetching predefined rituals:', error)
    return []
  }

  return data as Ritual[]
}

// ============================================
// MUTATIONS
// ============================================

export async function toggleCompletion(
  memberId: string,
  ritualId: string,
  existingCompletion?: RitualCompletion
): Promise<RitualCompletion | null> {
  const todayStr = getTodayStr()

  if (existingCompletion) {
    const newCompleted = !existingCompletion.completed
    const { data, error } = await supabase
      .from('ritual_completions')
      .update({ completed: newCompleted })
      .eq('id', existingCompletion.id)
      .select()
      .single()

    if (error) {
      console.error('Error toggling completion:', error)
      return null
    }
    return data as RitualCompletion
  }

  // Create new completion
  const { data, error } = await supabase
    .from('ritual_completions')
    .insert({
      member_id: memberId,
      ritual_id: ritualId,
      completion_date: todayStr,
      completed: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating completion:', error)
    return null
  }
  return data as RitualCompletion
}

export async function completeWithDetails(
  memberId: string,
  ritualId: string,
  details: { mood?: string | null; notes?: string | null; durationMinutes?: number | null },
  existingCompletion?: RitualCompletion
): Promise<RitualCompletion | null> {
  const todayStr = getTodayStr()

  if (existingCompletion) {
    const { data, error } = await supabase
      .from('ritual_completions')
      .update({
        completed: true,
        mood: details.mood || null,
        notes: details.notes || null,
        duration_minutes: details.durationMinutes ? Math.round(details.durationMinutes) : null,
      })
      .eq('id', existingCompletion.id)
      .select()
      .single()

    if (error) {
      console.error('Error completing with details:', error)
      return null
    }
    return data as RitualCompletion
  }

  const { data, error } = await supabase
    .from('ritual_completions')
    .insert({
      member_id: memberId,
      ritual_id: ritualId,
      completion_date: todayStr,
      completed: true,
      mood: details.mood || null,
      notes: details.notes || null,
      duration_minutes: details.durationMinutes ? Math.round(details.durationMinutes) : null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error completing with details:', error)
    return null
  }
  return data as RitualCompletion
}

export async function addRitualToList(
  memberId: string,
  ritualId: string,
  plannedTime: string
): Promise<MemberRitual | null> {
  // Check if previously added (soft-deleted)
  const { data: existing } = await supabase
    .from('member_rituals')
    .select('id, is_active')
    .eq('member_id', memberId)
    .eq('ritual_id', ritualId)
    .single()

  let data, error

  if (existing) {
    const result = await supabase
      .from('member_rituals')
      .update({
        is_active: true,
        planned_time: plannedTime,
        removed_at: null,
        added_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select(`
        id, ritual_id, tracking_type, is_active, planned_time,
        ritual:rituals(*)
      `)
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from('member_rituals')
      .insert({
        member_id: memberId,
        ritual_id: ritualId,
        tracking_type: 'checkbox',
        is_active: true,
        planned_time: plannedTime,
      })
      .select(`
        id, ritual_id, tracking_type, is_active, planned_time,
        ritual:rituals(*)
      `)
      .single()
    data = result.data
    error = result.error
  }

  if (error) {
    console.error('Error adding ritual:', error)
    return null
  }

  return data as unknown as MemberRitual
}

export async function removeRitualFromList(memberRitualId: string): Promise<boolean> {
  const { error } = await supabase
    .from('member_rituals')
    .update({ is_active: false, removed_at: new Date().toISOString() })
    .eq('id', memberRitualId)

  if (error) {
    console.error('Error removing ritual:', error)
    return false
  }
  return true
}

export async function createCustomRitual(
  memberId: string,
  details: {
    name: string
    description?: string
    icon?: string
    category: RitualCategory
    durationSuggestion?: number
  },
  plannedTime: string
): Promise<MemberRitual | null> {
  // Insert the ritual
  const { data: ritual, error: ritualError } = await supabase
    .from('rituals')
    .insert({
      name: details.name,
      name_fr: details.name,
      description: details.description || null,
      description_fr: details.description || null,
      category: details.category,
      icon: details.icon || 'heart',
      duration_suggestion: details.durationSuggestion || null,
      is_predefined: false,
      created_by: memberId,
    })
    .select()
    .single()

  if (ritualError || !ritual) {
    console.error('Error creating custom ritual:', ritualError)
    return null
  }

  // Then add to member's list
  return addRitualToList(memberId, ritual.id, plannedTime)
}
