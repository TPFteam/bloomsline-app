import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import {
  User,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Shield,
  HelpCircle,
  LogOut,
  Trash2,
  Check,
  X,
  Edit3,
  Info,
} from 'lucide-react-native'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

interface NotificationPrefs {
  email_enabled: boolean
  push_enabled: boolean
}

// ============================================
// MAIN SCREEN
// ============================================

export default function SettingsScreen() {
  const { user, member, signOut } = useAuth()
  const router = useRouter()

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({ email_enabled: true, push_enabled: true })
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const [savingNotifs, setSavingNotifs] = useState(false)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')

  const fullName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.user_metadata?.full_name || 'Member'

  const initial = (member?.first_name?.[0] || '?').toUpperCase()

  // ============================================
  // DATA LOADING
  // ============================================

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name || '')
      setLastName(member.last_name || '')
      setPhone(member.phone || '')
    }
  }, [member])

  useEffect(() => {
    fetchNotificationPrefs()
  }, [user?.id])

  async function fetchNotificationPrefs() {
    if (!user?.id) return
    setLoadingNotifs(true)
    const { data } = await supabase
      .from('notification_preferences')
      .select('email_enabled, push_enabled')
      .eq('user_id', user.id)
      .eq('user_type', 'member')
      .maybeSingle()

    if (data) {
      setNotifPrefs({ email_enabled: data.email_enabled, push_enabled: data.push_enabled })
    }
    setLoadingNotifs(false)
  }

  // ============================================
  // MUTATIONS
  // ============================================

  async function handleSaveProfile() {
    if (!member?.id) return
    setSavingProfile(true)
    const { error } = await supabase
      .from('members')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      })
      .eq('id', member.id)

    setSavingProfile(false)
    if (error) {
      showAlert('Error', 'Could not save profile. Please try again.')
    } else {
      setEditingProfile(false)
      showAlert('Saved', 'Your profile has been updated.')
    }
  }

  async function handleToggleNotif(key: 'email_enabled' | 'push_enabled') {
    if (!user?.id) return
    setSavingNotifs(true)
    const newPrefs = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(newPrefs)

    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('user_type', 'member')
      .maybeSingle()

    if (existing) {
      await supabase
        .from('notification_preferences')
        .update({ [key]: newPrefs[key], updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('user_type', 'member')
    } else {
      await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          user_type: 'member',
          ...newPrefs,
        })
    }
    setSavingNotifs(false)
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to sign out?')) signOut()
    } else {
      Alert.alert('Sign out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOut },
      ])
    }
  }

  function handleDeleteAccount() {
    if (deleteText !== 'DELETE') return
    showAlert(
      'Account Deletion',
      'Please contact your practitioner or email support@bloomsline.com to request account deletion.'
    )
    setShowDeleteConfirm(false)
    setDeleteText('')
  }

  function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`)
    } else {
      Alert.alert(title, message)
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#171717', flex: 1 }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

        {/* ===== PROFILE CARD ===== */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
          borderWidth: 1, borderColor: '#f3f4f6',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
        }}>
          {/* Profile header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <LinearGradient
              colors={['#34d399', '#059669']}
              style={{
                width: 56, height: 56, borderRadius: 28,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#ffffff' }}>{initial}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>{fullName}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>{user?.email}</Text>
              {member?.created_at && (
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  Member since {new Date(member.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Text>
              )}
            </View>
            {!editingProfile && (
              <TouchableOpacity
                onPress={() => setEditingProfile(true)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Edit3 size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Editable fields */}
          {editingProfile ? (
            <View style={{ gap: 12 }}>
              {/* First name */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 }}>First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  style={{
                    fontSize: 15, color: '#171717', padding: 12,
                    backgroundColor: '#f9fafb', borderRadius: 12,
                    borderWidth: 1, borderColor: '#e5e7eb',
                  }}
                />
              </View>

              {/* Last name */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 }}>Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  style={{
                    fontSize: 15, color: '#171717', padding: 12,
                    backgroundColor: '#f9fafb', borderRadius: 12,
                    borderWidth: 1, borderColor: '#e5e7eb',
                  }}
                />
              </View>

              {/* Phone */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 }}>Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Optional"
                  placeholderTextColor="#d1d5db"
                  style={{
                    fontSize: 15, color: '#171717', padding: 12,
                    backgroundColor: '#f9fafb', borderRadius: 12,
                    borderWidth: 1, borderColor: '#e5e7eb',
                  }}
                />
              </View>

              {/* Email (read-only) */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 }}>Email</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  padding: 12, backgroundColor: '#f3f4f6', borderRadius: 12,
                }}>
                  <Mail size={16} color="#9ca3af" />
                  <Text style={{ fontSize: 15, color: '#9ca3af' }}>{user?.email}</Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingProfile(false)
                    setFirstName(member?.first_name || '')
                    setLastName(member?.last_name || '')
                    setPhone(member?.phone || '')
                  }}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: '#f3f4f6', alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 6,
                  }}
                >
                  <X size={16} color="#6b7280" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={savingProfile || !firstName.trim() || !lastName.trim()}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: (!firstName.trim() || !lastName.trim()) ? '#d1d5db' : '#059669',
                    alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 6,
                  }}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Check size={16} color="#fff" />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Read-only display */
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={15} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>Name</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#171717' }}>{fullName}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail size={15} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>Email</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#171717' }}>{user?.email}</Text>
                </View>
              </View>

              {member?.phone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Phone size={15} color="#d97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>Phone</Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#171717' }}>{member.phone}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ===== NOTIFICATIONS ===== */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
          borderWidth: 1, borderColor: '#f3f4f6',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 12,
              backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={18} color="#7c3aed" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#171717' }}>Notifications</Text>
          </View>

          {loadingNotifs ? (
            <ActivityIndicator size="small" color="#7c3aed" style={{ paddingVertical: 12 }} />
          ) : (
            <View style={{ gap: 10 }}>
              {/* Email toggle */}
              <TouchableOpacity
                onPress={() => handleToggleNotif('email_enabled')}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, backgroundColor: '#f9fafb', borderRadius: 14,
                }}
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: notifPrefs.email_enabled ? '#dbeafe' : '#f3f4f6',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail size={16} color={notifPrefs.email_enabled ? '#3b82f6' : '#9ca3af'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>Email notifications</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Session reminders, updates</Text>
                </View>
                <View style={{
                  width: 48, height: 28, borderRadius: 14,
                  backgroundColor: notifPrefs.email_enabled ? '#059669' : '#d1d5db',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: '#fff',
                    alignSelf: notifPrefs.email_enabled ? 'flex-end' : 'flex-start',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
                  }} />
                </View>
              </TouchableOpacity>

              {/* Push toggle */}
              <TouchableOpacity
                onPress={() => handleToggleNotif('push_enabled')}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 14, backgroundColor: '#f9fafb', borderRadius: 14,
                }}
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: notifPrefs.push_enabled ? '#fce7f3' : '#f3f4f6',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {notifPrefs.push_enabled ? (
                    <Bell size={16} color="#ec4899" />
                  ) : (
                    <BellOff size={16} color="#9ca3af" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>Push notifications</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Real-time alerts on your device</Text>
                </View>
                <View style={{
                  width: 48, height: 28, borderRadius: 14,
                  backgroundColor: notifPrefs.push_enabled ? '#059669' : '#d1d5db',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: '#fff',
                    alignSelf: notifPrefs.push_enabled ? 'flex-end' : 'flex-start',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
                  }} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ===== HELP & ABOUT ===== */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 6, marginBottom: 16,
          borderWidth: 1, borderColor: '#f3f4f6',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
        }}>
          {/* Privacy Policy */}
          <TouchableOpacity
            onPress={() => Linking.openURL('https://bloomsline.com/privacy')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 14,
            }}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={16} color="#059669" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#171717', flex: 1 }}>Privacy Policy</Text>
            <ChevronRight size={16} color="#d1d5db" />
          </TouchableOpacity>

          {/* Terms */}
          <TouchableOpacity
            onPress={() => Linking.openURL('https://bloomsline.com/terms')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 14,
            }}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
            }}>
              <Info size={16} color="#3b82f6" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#171717', flex: 1 }}>Terms of Service</Text>
            <ChevronRight size={16} color="#d1d5db" />
          </TouchableOpacity>

          {/* Help / Support */}
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:support@bloomsline.com')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 14,
            }}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center',
            }}>
              <HelpCircle size={16} color="#d97706" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#171717', flex: 1 }}>Help & Support</Text>
            <ChevronRight size={16} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* ===== SIGN OUT ===== */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12,
            borderWidth: 1, borderColor: '#f3f4f6',
            flexDirection: 'row', alignItems: 'center', gap: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
          }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
          }}>
            <LogOut size={18} color="#ef4444" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#ef4444' }}>Sign out</Text>
        </TouchableOpacity>

        {/* ===== DELETE ACCOUNT ===== */}
        {!showDeleteConfirm ? (
          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20,
              borderWidth: 1, borderColor: '#f3f4f6',
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 12,
              backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trash2 size={18} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#9ca3af' }}>Delete account</Text>
          </TouchableOpacity>
        ) : (
          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
            borderWidth: 1, borderColor: '#fecaca',
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444', marginBottom: 8 }}>
              Delete your account?
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 14 }}>
              This action cannot be undone. All your data will be permanently removed. Type DELETE to confirm.
            </Text>
            <TextInput
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder='Type "DELETE"'
              placeholderTextColor="#d1d5db"
              autoCapitalize="characters"
              style={{
                fontSize: 15, color: '#ef4444', padding: 12, fontWeight: '600',
                backgroundColor: '#fef2f2', borderRadius: 12,
                borderWidth: 1, borderColor: '#fecaca', marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: '#f3f4f6', alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleteText !== 'DELETE'}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: deleteText === 'DELETE' ? '#ef4444' : '#fecaca',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* App version */}
        <Text style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', marginBottom: 20 }}>
          Bloomsline v1.0.0
        </Text>

      </ScrollView>
    </SafeAreaView>
  )
}
