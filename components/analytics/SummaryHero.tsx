import { useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Share, Animated as RNAnimated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Sparkles, MessageCircle, Share2 } from 'lucide-react-native'
import type { Theme } from './shared'

type Props = {
  summary: string
  shareQuote: string
  summaryGradient: [string, string]
  isDark: boolean
  theme: Theme
  onClose: () => void
  onTalkToBloom?: (message: string) => void
}

export default function SummaryHero({
  summary, shareQuote, summaryGradient, isDark, theme, onClose, onTalkToBloom,
}: Props) {
  const summaryCardRef = useRef<View>(null)
  const fadeAnim = useRef(new RNAnimated.Value(0)).current
  const scaleAnim = useRef(new RNAnimated.Value(0.96)).current

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      RNAnimated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  const handleShare = async () => {
    try {
      const uri = await captureRef(summaryCardRef, { format: 'png', quality: 1, result: 'tmpfile' })
      await Sharing.shareAsync('file://' + uri, { mimeType: 'image/png', UTI: 'public.png' })
    } catch {
      await Share.share({ message: `${summary}\n\n"${shareQuote}"\n\n— bloomsline` })
    }
  }

  return (
    <>
      <RNAnimated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <View ref={summaryCardRef} collapsable={false}>
          <LinearGradient
            colors={[`${summaryGradient[0]}${isDark ? '30' : '40'}`, `${summaryGradient[1]}${isDark ? '30' : '40'}`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22, padding: 28, marginBottom: 8,
              shadowColor: summaryGradient[0],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15, shadowRadius: 24, elevation: 6,
            }}
          >
            <Sparkles size={18} color={summaryGradient[0]} style={{ marginBottom: 14 }} />
            <Text style={{
              fontSize: 19, lineHeight: 30, fontWeight: '600',
              color: isDark ? 'rgba(255,255,255,0.9)' : '#1f2937',
            }}>
              {summary}
            </Text>

            {/* Shareable quote */}
            <View style={{
              marginTop: 20, paddingTop: 18, position: 'relative',
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              {/* Decorative quote mark */}
              <Text style={{
                position: 'absolute', top: 6, left: -2,
                fontSize: 48, lineHeight: 48, fontWeight: '800',
                color: summaryGradient[0], opacity: 0.12,
              }}>
                {'\u201C'}
              </Text>
              <Text style={{
                fontSize: 17, lineHeight: 26, fontWeight: '600', fontStyle: 'italic',
                color: isDark ? 'rgba(255,255,255,0.75)' : '#374151',
                paddingLeft: 4,
              }}>
                "{shareQuote}"
              </Text>
            </View>

            {/* Watermark pill */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', marginTop: 18,
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: summaryGradient[0],
                }} />
                <Text style={{
                  fontSize: 11, fontWeight: '600', letterSpacing: 0.5,
                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                }}>
                  bloomsline
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </RNAnimated.View>

      {/* CTAs */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 44 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (onTalkToBloom) {
              onClose()
              setTimeout(() => onTalkToBloom(summary), 300)
            }
          }}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 12, borderRadius: 14,
            backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
          }}
        >
          <MessageCircle size={16} color="#10b981" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#10b981' }}>Talk about it</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleShare}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 12, borderRadius: 14,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <Share2 size={16} color={isDark ? 'rgba(255,255,255,0.6)' : '#6b7280'} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }}>Share</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
