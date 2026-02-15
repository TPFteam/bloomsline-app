import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable, Alert, Animated, Platform } from 'react-native'
import { Tabs, useRouter, useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Home, Sun, Circle, Menu, Camera, X,
  Heart, User, PieChart, Settings, LogOut,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'

const menuItems = [
  { label: 'Progress', icon: Heart, gradient: ['#34d399', '#14b8a6'] as const, route: '/progress' },
  { label: 'My Practitioner', icon: User, gradient: ['#fb7185', '#ec4899'] as const, route: '/practitioner' },
  { label: 'Balance', icon: PieChart, gradient: ['#8b5cf6', '#7c3aed'] as const, route: '/balance' },
  { label: 'Settings', icon: Settings, gradient: ['#9ca3af', '#6b7280'] as const, route: '/settings' },
]

function FloatingCameraButton() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tilt = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 1000, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [tilt])

  const rotate = tilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  })

  return (
    <View style={{
      position: 'absolute',
      bottom: Math.max(insets.bottom, 16) + 68,
      right: 24,
      zIndex: 100,
    }}>
      <TouchableOpacity
        onPress={() => router.push('/capture')}
        activeOpacity={0.85}
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fb7185',
          shadowColor: '#f43f5e',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Camera size={24} color="#ffffff" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const safeBottom = Math.max(insets.bottom, 16)
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const segments = useSegments()
  const { signOut } = useAuth()

  // Hide tab bar on Moments screen (per-screen tabBarStyle is unreliable in production)
  const hideTabBar = segments[segments.length - 1] === 'moments'

  function handleSignOut() {
    setShowMenu(false)
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to sign out?')) signOut()
    } else {
      Alert.alert('Sign out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOut },
      ])
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#059669',
          tabBarInactiveTintColor: '#a3a3a3',
          tabBarStyle: hideTabBar ? {
            display: 'none' as const,
            height: 0,
            overflow: 'hidden' as const,
          } : {
            position: 'absolute' as const,
            bottom: safeBottom,
            left: 16,
            right: 16,
            backgroundColor: '#ffffff',
            borderRadius: 28,
            borderTopWidth: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 10,
            height: 88,
            paddingTop: 14,
            paddingBottom: 18,
            overflow: 'visible' as const,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="moments"
          options={{
            title: 'Moments',
            tabBarIcon: ({ color }) => <Sun size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="rituals"
          options={{
            title: 'Rituals',
            tabBarIcon: ({ color }) => <Circle size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color }) => (
              showMenu
                ? <X size={22} color="#059669" />
                : <Menu size={22} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setShowMenu(prev => !prev)
            },
          }}
        />
        {/* Hide from tabs — accessed via Menu */}
        <Tabs.Screen name="progress" options={{ href: null }} />
        <Tabs.Screen name="practitioner" options={{ href: null }} />
        <Tabs.Screen name="stories" options={{ href: null }} />
        <Tabs.Screen name="reflect" options={{ href: null }} />
        <Tabs.Screen name="balance" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>

      {!hideTabBar && <FloatingCameraButton />}

      {/* Menu Popup */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              position: 'absolute',
              bottom: safeBottom + 100,
              right: 20,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 8,
              minWidth: 200,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 20,
            }}
          >
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  setShowMenu(false)
                  if (item.route) {
                    router.push(item.route as any)
                  } else {
                    setTimeout(() => {
                      if (Platform.OS === 'web') {
                        alert(`${item.label} is coming soon!`)
                      } else {
                        Alert.alert('Coming soon', `${item.label} will be available soon.`)
                      }
                    }, 200)
                  }
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                }}
              >
                <LinearGradient
                  colors={[...item.gradient]}
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <item.icon size={18} color="#ffffff" />
                </LinearGradient>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#374151' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Divider + Sign out */}
            <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 4, marginHorizontal: 12 }} />
            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 14,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: '#fef2f2',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <LogOut size={18} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#ef4444' }}>
                Sign out
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}
