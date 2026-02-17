import { View, Text } from 'react-native'

type Props = {
  title: string
  subtitle: string
  isDark: boolean
  accentColor?: string
}

export default function SectionHeader({ title, subtitle, isDark, accentColor }: Props) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{
        width: 32, height: 3, borderRadius: 2,
        backgroundColor: accentColor || (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
        opacity: 0.6,
        marginBottom: 10,
      }} />
      <Text style={{
        fontSize: 20, fontWeight: '800', letterSpacing: -0.3,
        color: isDark ? '#ffffff' : '#111827',
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 14, lineHeight: 20,
        color: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af',
        marginTop: 4,
      }}>
        {subtitle}
      </Text>
    </View>
  )
}
