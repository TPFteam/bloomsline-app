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
import { useRouter } from 'expo-router'
import { Calendar, ChevronRight } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/types/member'

export default function HomeScreen() {
  const { user, member } = useAuth()
  const router = useRouter()
  const [upcomingSession, setUpcomingSession] = useState<Session | null>(null)
  const [recentMoments, setRecentMoments] = useState<number>(0)
  const [ritualStreak] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const firstName = member?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  async function fetchData() {
    if (!member?.id) return

    const [sessionsRes, momentsRes] = await Promise.all([
      // Next upcoming session
      supabase
        .from('sessions')
        .select('*')
        .eq('member_id', member.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1),
      // Moments this week
      supabase
        .from('moments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    if (sessionsRes.data?.[0]) setUpcomingSession(sessionsRes.data[0])
    setRecentMoments(momentsRes.count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [member?.id])

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  function formatSessionDate(dateStr: string) {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (isToday) return `Today at ${time}`
    if (isTomorrow) return `Tomorrow at ${time}`
    return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`
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
        {/* Greeting */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#171717' }}>
            {getGreeting()}, {firstName}
          </Text>
          <Text style={{ fontSize: 15, color: '#737373', marginTop: 4 }}>
            Here's what's happening today
          </Text>
        </View>

        {/* Next Session Card */}
        {upcomingSession && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color="#059669" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Next session
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#171717', marginTop: 2 }}>
                    {formatSessionDate(upcomingSession.scheduled_at)}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#a3a3a3" />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/moments')}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#171717' }}>
              {recentMoments}
            </Text>
            <Text style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>
              Moments this week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/rituals')}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#171717' }}>
              {ritualStreak}
            </Text>
            <Text style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>
              Day streak
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#171717', marginBottom: 12 }}>
          Quick actions
        </Text>
        <View style={{ gap: 8 }}>
          {[
            { label: 'Capture a moment', icon: '📸', route: '/(tabs)/moments' },
            { label: 'Start a ritual', icon: '🔄', route: '/(tabs)/rituals' },
            { label: 'Check your progress', icon: '📈', route: '/(tabs)/progress' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => router.push(action.route as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                gap: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 20 }}>{action.icon}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: '#171717' }}>
                {action.label}
              </Text>
              <ChevronRight size={18} color="#d4d4d4" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
