import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '@/lib/auth-context'

export default function SignUp() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!fullName || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error } = await signUp(email.trim().toLowerCase(), password, fullName.trim())
    setLoading(false)

    if (error) {
      Alert.alert('Sign up failed', error.message)
    } else {
      Alert.alert('Check your email', 'We sent you a confirmation link.')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#10b981',
              marginBottom: 16,
            }}
          />
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#171717' }}>
            Bloomsline
          </Text>
          <Text style={{ fontSize: 15, color: '#737373', marginTop: 4 }}>
            Create your account
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 12 }}>
          <TextInput
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            style={{
              borderWidth: 1,
              borderColor: '#e5e5e5',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: '#171717',
              backgroundColor: '#fafafa',
            }}
            placeholderTextColor="#a3a3a3"
          />

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={{
              borderWidth: 1,
              borderColor: '#e5e5e5',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: '#171717',
              backgroundColor: '#fafafa',
            }}
            placeholderTextColor="#a3a3a3"
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            style={{
              borderWidth: 1,
              borderColor: '#e5e5e5',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: '#171717',
              backgroundColor: '#fafafa',
            }}
            placeholderTextColor="#a3a3a3"
          />

          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading}
            style={{
              backgroundColor: '#10b981',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                Create account
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign in link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: '#737373', fontSize: 14 }}>
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '600' }}>
                Sign in
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
