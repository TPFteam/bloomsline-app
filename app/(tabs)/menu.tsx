import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { User, Settings, LogOut, BookOpen, Heart, PieChart } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'

export default function MenuScreen() {
  const { user, member, signOut } = useAuth()

  const fullName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.user_metadata?.full_name || 'Member'

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ])
  }

  const menuItems = [
    { icon: User, label: 'My Practitioner', color: '#059669' },
    { icon: PieChart, label: 'Balance', color: '#6366f1' },
    { icon: Heart, label: 'Reflect', color: '#f43f5e' },
    { icon: BookOpen, label: 'Resources', color: '#f59e0b' },
    { icon: Settings, label: 'Settings', color: '#737373' },
  ]

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
          <View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#171717' }}>{fullName}</Text>
            <Text style={{ fontSize: 13, color: '#737373' }}>{user?.email}</Text>
          </View>
        </View>

        {/* Menu items */}
        <View style={{ gap: 4 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 14, paddingHorizontal: 4,
              }}
            >
              <item.icon size={22} color={item.color} />
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#171717' }}>{item.label}</Text>
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
