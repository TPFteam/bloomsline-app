import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import Svg, { Path, Rect } from 'react-native-svg'
import { ArrowLeft } from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  )
}

function MicrosoftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 23 23">
      <Rect x="1" y="1" width="10" height="10" fill="#f35325" />
      <Rect x="12" y="1" width="10" height="10" fill="#81bc06" />
      <Rect x="1" y="12" width="10" height="10" fill="#05a6f0" />
      <Rect x="12" y="12" width="10" height="10" fill="#ffba08" />
    </Svg>
  )
}

export default function SignUp() {
  const { signInWithGoogle, signInWithAzure } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'azure' | null>(null)

  async function handleGoogle() {
    setLoadingProvider('google')
    const { error } = await signInWithGoogle()
    if (error) Alert.alert('Sign up failed', error.message || 'An unexpected error occurred')
    setLoadingProvider(null)
  }

  async function handleAzure() {
    setLoadingProvider('azure')
    const { error } = await signInWithAzure()
    if (error) Alert.alert('Sign up failed', error.message || 'An unexpected error occurred')
    setLoadingProvider(null)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Soft gradient background orb */}
      <View
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: SCREEN_WIDTH * 1.5,
          height: SCREEN_WIDTH * 1.5,
          borderRadius: SCREEN_WIDTH * 0.75,
          backgroundColor: 'rgba(204, 251, 241, 0.25)',
          transform: [
            { translateX: -(SCREEN_WIDTH * 0.75) },
            { translateY: -(SCREEN_WIDTH * 0.75) },
          ],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: '40%',
          left: '40%',
          width: SCREEN_WIDTH * 1.2,
          height: SCREEN_WIDTH * 1.2,
          borderRadius: SCREEN_WIDTH * 0.6,
          backgroundColor: 'rgba(167, 243, 208, 0.15)',
          transform: [
            { translateX: -(SCREEN_WIDTH * 0.6) },
            { translateY: -(SCREEN_WIDTH * 0.6) },
          ],
        }}
      />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 52 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#10b981' }} />
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#171717' }}>Bloomsline</Text>
        </View>
        <Link href="/" asChild>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} color="#737373" />
            <Text style={{ fontSize: 14, color: '#737373' }}>Home</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Main content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: '100%', maxWidth: 380 }}>
          {/* Welcome text */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 32, fontWeight: '300', color: '#171717', marginBottom: 8 }}>
              Get started
            </Text>
            <Text style={{ fontSize: 15, color: '#737373' }}>
              Create your account to begin.
            </Text>
          </View>

          {/* Card */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 20,
              paddingHorizontal: 24,
              paddingVertical: 28,
              borderWidth: 1,
              borderColor: 'rgba(229, 229, 229, 0.5)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Google button */}
            <TouchableOpacity
              onPress={handleGoogle}
              disabled={loadingProvider !== null}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: '#171717',
                borderRadius: 999,
                paddingVertical: 14,
                opacity: loadingProvider !== null ? 0.5 : 1,
              }}
            >
              {loadingProvider === 'google' ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '500' }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e5e5e5' }} />
              <Text style={{ marginHorizontal: 12, fontSize: 12, color: '#a3a3a3' }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e5e5e5' }} />
            </View>

            {/* Outlook button */}
            <TouchableOpacity
              onPress={handleAzure}
              disabled={loadingProvider !== null}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: '#ffffff',
                borderRadius: 999,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: '#e5e5e5',
                opacity: loadingProvider !== null ? 0.5 : 1,
              }}
            >
              {loadingProvider === 'azure' ? (
                <ActivityIndicator color="#171717" size="small" />
              ) : (
                <>
                  <MicrosoftIcon />
                  <Text style={{ color: '#171717', fontSize: 15, fontWeight: '500' }}>
                    Continue with Outlook
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Sign in link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ fontSize: 14, color: '#737373' }}>
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text style={{ fontSize: 14, color: '#0d9488', fontWeight: '500' }}>
                    Sign in
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Terms */}
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#a3a3a3', marginTop: 24 }}>
            By continuing, you agree to our{' '}
            <Text style={{ color: '#737373' }}>Terms</Text>
            {' '}and{' '}
            <Text style={{ color: '#737373' }}>Privacy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
