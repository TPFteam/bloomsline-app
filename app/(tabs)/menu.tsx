import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { User, Settings, LogOut, BookOpen, Heart, PieChart, ChevronRight } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'

export default function MenuScreen() {
  const { user, member, signOut } = useAuth()
  const router = useRouter()

  const fullName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.user_metadata?.full_name || 'Member'

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to sign out?')) signOut()
    } else {
      Alert.alert('Sign out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOut },
      ])
    }
  }

  const menuItems: { icon: any; label: string; color: string; route: string | null }[] = [
    { icon: Heart, label: 'Progress', color: '#059669', route: '/progress' },
    { icon: User, label: 'My Practitioner', color: '#ec4899', route: '/practitioner' },
    { icon: PieChart, label: 'Balance', color: '#6366f1', route: null },
    { icon: Heart, label: 'Reflect', color: '#f43f5e', route: null },
    { icon: BookOpen, label: 'Resources', color: '#f59e0b', route: null },
    { icon: Settings, label: 'Settings', color: '#737373', route: null },
  ]

  function handleItemPress(item: typeof menuItems[0]) {
    if (item.route) {
      router.push(item.route as any)
    } else {
      if (Platform.OS === 'web') {
        alert(`${item.label} is coming soon!`)
      } else {
        Alert.alert('Coming soon', `${item.label} will be available soon.`)
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <View style={{ padding: 20 }}>
        {/* Profile header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#059669' }}>
              {(member?.first_name?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#171717' }}>{fullName}</Text>
            <Text style={{ fontSize: 13, color: '#737373' }}>{user?.email}</Text>
          </View>
        </View>

        {/* Menu items */}
        <View style={{ gap: 4 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 14, paddingHorizontal: 4,
              }}
            >
              <item.icon size={22} color={item.color} />
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#171717', flex: 1 }}>{item.label}</Text>
              {!item.route && (
                <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#9ca3af' }}>Soon</Text>
                </View>
              )}
              {item.route && <ChevronRight size={18} color="#d1d5db" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            paddingVertical: 14, paddingHorizontal: 4, marginTop: 24,
            borderTopWidth: 1, borderTopColor: '#f5f5f5',
          }}
        >
          <LogOut size={22} color="#ef4444" />
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#ef4444' }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
