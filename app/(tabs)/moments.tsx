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
import { Plus, Camera, Mic, PenLine } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type Moment = {
  id: string
  type: 'photo' | 'video' | 'voice' | 'write'
  caption: string | null
  created_at: string
}

export default function MomentsScreen() {
  const { user } = useAuth()
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchMoments() {
    if (!user) return
    const { data } = await supabase
      .from('moments')
      .select('id, type, caption, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setMoments(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMoments() }, [user?.id])

  async function onRefresh() {
    setRefreshing(true)
    await fetchMoments()
    setRefreshing(false)
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'photo': case 'video': return '📸'
      case 'voice': return '🎙️'
      case 'write': return '✍️'
      default: return '💭'
    }
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#171717' }}>Moments</Text>
          <TouchableOpacity
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {moments.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🌱</Text>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#171717' }}>No moments yet</Text>
            <Text style={{ fontSize: 14, color: '#737373', marginTop: 4, textAlign: 'center' }}>
              Capture a photo, voice note, or write something down
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {moments.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
                }}
              >
                <Text style={{ fontSize: 22 }}>{typeIcon(m.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#171717' }} numberOfLines={1}>
                    {m.caption || `${m.type.charAt(0).toUpperCase() + m.type.slice(1)} moment`}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#a3a3a3', marginTop: 2 }}>
                    {new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
