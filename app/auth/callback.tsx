import { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const params = useLocalSearchParams()

  useEffect(() => {
    async function handleCallback() {
      // On web, Supabase auto-detects the hash fragment and sets the session
      // We just need to wait for it, then redirect
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        router.replace('/(tabs)')
      } else {
        // If no session after a moment, try refreshing
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        if (retrySession) {
          router.replace('/(tabs)')
        } else {
          router.replace('/(auth)/sign-in')
        }
      }
    }

    handleCallback()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#059669" />
      <Text style={{ color: '#737373', fontSize: 14, marginTop: 16 }}>
        Signing you in...
      </Text>
    </View>
  )
}
