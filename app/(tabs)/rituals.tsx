import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Check, Circle } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type Ritual = {
  id: string
  title: string
  completed: boolean
  created_at: string
}

export default function RitualsScreen() {
  const { user } = useAuth()
  const [rituals, setRituals] = useState<Ritual[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchRituals() {
    if (!user) return
    const { data } = await supabase
      .from('rituals')
      .select('id, title, completed, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setRituals(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRituals() }, [user?.id])

  async function onRefresh() {
    setRefreshing(true)
    await fetchRituals()
    setRefreshing(false)
  }

  async function toggleRitual(id: string, completed: boolean) {
    setRituals(prev => prev.map(r => r.id === id ? { ...r, completed: !completed } : r))
    await supabase.from('rituals').update({ completed: !completed }).eq('id', id)
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
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#171717', marginBottom: 24 }}>Rituals</Text>

        {rituals.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔄</Text>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#171717' }}>No rituals yet</Text>
            <Text style={{ fontSize: 14, color: '#737373', marginTop: 4, textAlign: 'center' }}>
              Small daily practices that build over time
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {rituals.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => toggleRitual(r.id, r.completed)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    borderWidth: 2,
                    borderColor: r.completed ? '#059669' : '#d4d4d4',
                    backgroundColor: r.completed ? '#059669' : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {r.completed && <Check size={16} color="#ffffff" />}
                </View>
                <Text
                  style={{
                    flex: 1, fontSize: 15, fontWeight: '500',
                    color: r.completed ? '#a3a3a3' : '#171717',
                    textDecorationLine: r.completed ? 'line-through' : 'none',
                  }}
                >
                  {r.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
