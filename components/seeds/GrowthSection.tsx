import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native'
import {
  Circle, Flame, Trophy, BarChart3, Hash,
  ChevronDown, ChevronUp, Trash2,
} from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import SectionHeader from '@/components/analytics/SectionHeader'
import { Card, ANCHOR_ICONS, type Anchor, type AnchorStats } from './shared'

type Props = {
  index: number
  anchors: Anchor[]
  monthDays: string[]
  today: string
  historyMap: Record<string, Record<string, number>>
  anchorStats: Record<string, AnchorStats>
  mostConsistent: Anchor | null
  onDeleteAnchor: (anchor: Anchor) => void
}

export default function GrowthSection({
  index,
  anchors,
  monthDays,
  today,
  historyMap,
  anchorStats,
  mostConsistent,
  onDeleteAnchor,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [growthView, setGrowthView] = useState<'visual' | 'data'>('visual')

  // Summary stats
  const totalActive = anchors.length
  const bestStreak = Math.max(0, ...anchors.map(a => anchorStats[a.id]?.currentStreak ?? 0))
  const totalLast30 = anchors.reduce((sum, a) => sum + (anchorStats[a.id]?.last30 ?? 0), 0)

  function confirmDelete(anchor: Anchor) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${anchor.label_en}" from your seeds? Your past logs will be kept.`)) {
        onDeleteAnchor(anchor)
      }
    } else {
      Alert.alert(
        'Remove seed',
        `Remove "${anchor.label_en}" from your seeds? Your past logs will be kept.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onDeleteAnchor(anchor) },
        ],
      )
    }
  }

  return (
    <AnimatedSection index={index}>
      <Card>
        <SectionHeader title="Your growth" subtitle="Last 30 days" isDark={false} accentColor="#059669" />

        {/* Summary rows — always visible */}
        {anchors.map(anchor => {
          const Icon = ANCHOR_ICONS[anchor.icon] || Circle
          const isGrow = anchor.type === 'grow'
          const accent = isGrow ? '#059669' : '#d97706'
          const lightBg = isGrow ? '#d1fae5' : '#fef3c7'
          const stats = anchorStats[anchor.id]
          if (!stats) return null
          const strengthPct = Math.round((stats.last30 / 30) * 100)

          return (
            <View key={anchor.id} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
            }}>
              <View style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: lightBg,
                alignItems: 'center', justifyContent: 'center', marginRight: 10,
              }}>
                <Icon size={15} color={accent} />
              </View>

              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', color: '#1a1a1a', flex: 1 }}>
                {anchor.label_en}
              </Text>

              {/* Strength bar */}
              <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: '#f3f4f6', marginRight: 8 }}>
                <View style={{ height: 6, borderRadius: 3, width: `${strengthPct}%`, backgroundColor: accent }} />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: accent, width: 32, textAlign: 'right' }}>
                {stats.last30}/30
              </Text>

              {stats.currentStreak >= 2 && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6,
                  backgroundColor: `${accent}12`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
                }}>
                  <Flame size={11} color={accent} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>{stats.currentStreak}</Text>
                </View>
              )}
            </View>
          )
        })}

        {/* Footer: summary + expand toggle */}
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 14,
          }}
        >
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>
            {totalActive} seed{totalActive !== 1 ? 's' : ''}
            {bestStreak >= 2 ? ` \u00b7 best streak ${bestStreak}d` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>
              {expanded ? 'Less' : 'Details'}
            </Text>
            {expanded
              ? <ChevronUp size={16} color="#059669" />
              : <ChevronDown size={16} color="#059669" />
            }
          </View>
        </TouchableOpacity>

        {/* Most consistent callout */}
        {mostConsistent && anchorStats[mostConsistent.id]?.last30 > 0 && (
          <View style={{
            marginTop: 14, backgroundColor: '#ecfdf5', borderRadius: 12, padding: 12,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <Trophy size={16} color="#059669" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: '#374151', flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#059669' }}>Most consistent: </Text>
              {mostConsistent.label_en} — {anchorStats[mostConsistent.id].last30}/30 days
            </Text>
          </View>
        )}
      </Card>

      {/* Expanded: full detail view */}
      {expanded && (
        <Card>
          {/* View toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Seed details</Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3 }}>
              <TouchableOpacity
                onPress={() => setGrowthView('visual')}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: growthView === 'visual' ? '#ffffff' : 'transparent',
                  shadowColor: growthView === 'visual' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: growthView === 'visual' ? 0.1 : 0,
                  shadowRadius: 2,
                  elevation: growthView === 'visual' ? 2 : 0,
                }}
              >
                <BarChart3 size={16} color={growthView === 'visual' ? '#111827' : '#9ca3af'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setGrowthView('data')}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: growthView === 'data' ? '#ffffff' : 'transparent',
                  shadowColor: growthView === 'data' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: growthView === 'data' ? 0.1 : 0,
                  shadowRadius: 2,
                  elevation: growthView === 'data' ? 2 : 0,
                }}
              >
                <Hash size={16} color={growthView === 'data' ? '#111827' : '#9ca3af'} />
              </TouchableOpacity>
            </View>
          </View>

          {growthView === 'visual' ? (
            <View>
              {anchors.map(anchor => {
                const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                const isGrow = anchor.type === 'grow'
                const stats = anchorStats[anchor.id]
                if (!stats) return null
                const dateCounts = historyMap[anchor.id] || {}
                const accent = isGrow ? '#059669' : '#d97706'
                const bgTint = isGrow ? '#f0fdf4' : '#fffbeb'
                const barEmpty = isGrow ? '#dcfce7' : '#fef3c7'
                let maxCount = 1
                for (const day of monthDays) {
                  const c = dateCounts[day] || 0
                  if (c > maxCount) maxCount = c
                }
                return (
                  <View key={anchor.id} style={{
                    backgroundColor: bgTint, borderRadius: 14, padding: 14, marginBottom: 10,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: isGrow ? '#dcfce7' : '#fef3c7',
                        alignItems: 'center', justifyContent: 'center', marginRight: 8,
                      }}>
                        <Icon size={13} color={accent} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 }}>
                        {anchor.label_en}
                      </Text>
                      {stats.currentStreak > 0 && (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center',
                          backgroundColor: isGrow ? '#dcfce7' : '#fef3c7',
                          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 3,
                        }}>
                          <Flame size={12} color={accent} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: accent }}>{stats.currentStreak}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => confirmDelete(anchor)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginLeft: 8, padding: 4 }}
                      >
                        <Trash2 size={14} color="#d1d5db" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 1.5 }}>
                      {monthDays.map(day => {
                        const count = dateCounts[day] || 0
                        const height = count > 0 ? Math.max(4, (count / maxCount) * 32) : 2
                        const isT = day === today
                        return (
                          <View key={day} style={{
                            flex: 1, height, borderRadius: 2,
                            backgroundColor: count > 0 ? accent : barEmpty,
                            opacity: count > 0 ? (isT ? 1 : 0.7 + (count / maxCount) * 0.3) : 0.5,
                          }} />
                        )
                      })}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>{stats.last30}/30 days</Text>
                      <View style={{ width: 1, height: 10, backgroundColor: isGrow ? '#bbf7d0' : '#fde68a' }} />
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>Best: {stats.bestStreak}d</Text>
                      <View style={{ width: 1, height: 10, backgroundColor: isGrow ? '#bbf7d0' : '#fde68a' }} />
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>Total: {stats.total}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingRight: 2 }}>
                <View style={{ flex: 1 }} />
                <Text style={{ width: 40, fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Streak</Text>
                <Text style={{ width: 40, fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>Best</Text>
                <Text style={{ width: 72, fontSize: 10, color: '#9ca3af', textAlign: 'right' }}>Strength</Text>
              </View>

              {anchors.map(anchor => {
                const Icon = ANCHOR_ICONS[anchor.icon] || Circle
                const isGrow = anchor.type === 'grow'
                const stats = anchorStats[anchor.id]
                if (!stats) return null
                const strengthPct = Math.round((stats.last30 / 30) * 100)
                const accent = isGrow ? '#059669' : '#d97706'
                const bgTint = isGrow ? '#dcfce7' : '#fef3c7'

                return (
                  <View key={anchor.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                  }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 30, height: 30, borderRadius: 15,
                        backgroundColor: bgTint,
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                      }}>
                        <Icon size={14} color={accent} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 13, color: '#374151', flex: 1 }}>{anchor.label_en}</Text>
                    </View>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: accent }}>{stats.currentStreak}</Text>
                    </View>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#9ca3af' }}>{stats.bestStreak}</Text>
                    </View>
                    <View style={{ width: 72, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#f3f4f6' }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${strengthPct}%`, backgroundColor: accent }} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: accent, width: 28, textAlign: 'right' }}>{stats.last30}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDelete(anchor)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <Trash2 size={14} color="#d1d5db" />
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}
        </Card>
      )}
    </AnimatedSection>
  )
}
