import { useEffect } from 'react'
import { useFonts } from 'expo-font'
import { Slot, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '@/lib/auth-context'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

function AuthGate() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  return <Slot />
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <AuthProvider>
      <AuthGate />
      <StatusBar style="dark" />
    </AuthProvider>
  )
}
