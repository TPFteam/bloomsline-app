import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export default function ProgressScreen() {
  const { user, member } = useAuth()
  const [stats, setStats] = useState({ moments: 0, rituals: 0, sessions: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchStats() {
    if (!user || !member) return

    const [momentsRes, ritualsRes, sessionsRes] = await Promise.all([
      supabase.from('moments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('rituals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('member_id', member.id).eq('status', 'completed'),
    ])

    setStats({
      moments: momentsRes.count ?? 0,
      rituals: ritualsRes.count ?? 0,
      sessions: sessionsRes.count ?? 0,
    })
    setLoading(false)
  }

  useEffect(() => { fetchStats() }, [user?.id, member?.id])

  async function onRefresh() {
    setRefreshing(true)
    await fetchStats()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#171717', marginBottom: 24 }}>Progress</Text>

        <View style={{ gap: 12 }}>
          {[
            { label: 'Moments captured', value: stats.moments, emoji: '📸' },
            { label: 'Rituals completed', value: stats.rituals, emoji: '✅' },
            { label: 'Sessions attended', value: stats.sessions, emoji: '🗓️' },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
              }}
            >
              <Text style={{ fontSize: 28, marginRight: 16 }}>{stat.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#171717' }}>{stat.value}</Text>
                <Text style={{ fontSize: 13, color: '#737373', marginTop: 2 }}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
