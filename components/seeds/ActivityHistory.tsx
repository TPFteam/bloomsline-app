import { View, Text } from 'react-native'
import { History, PlusCircle, MinusCircle, RefreshCw, Circle } from 'lucide-react-native'
import AnimatedSection from '@/components/analytics/AnimatedSection'
import { Card, ANCHOR_ICONS, type ActivityLog } from './shared'

type Props = {
  index: number
  activityLogs: ActivityLog[]
}

export default function ActivityHistory({ index, activityLogs }: Props) {
  return (
    <AnimatedSection index={index}>
      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Recent Activity</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Last 30 days</Text>

        {activityLogs.length > 0 ? (
          <>
            {activityLogs.map(log => {
              const Icon = ANCHOR_ICONS[log.anchor_icon] || Circle
              const isGrow = log.anchor_type === 'grow'
              const date = new Date(log.created_at)
              const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

              return (
                <View key={log.id} style={{
                  flexDirection: 'row', alignItems: 'center', padding: 12,
                  borderRadius: 14, backgroundColor: isGrow ? '#f0fdf4' : '#fffbeb',
                  marginBottom: 8,
                }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: log.action === 'added' ? '#dcfce7'
                      : log.action === 'removed' ? '#fee2e2' : '#dbeafe',
                    alignItems: 'center', justifyContent: 'center', marginRight: 10,
                  }}>
                    {log.action === 'added' && <PlusCircle size={16} color="#16a34a" />}
                    {log.action === 'removed' && <MinusCircle size={16} color="#dc2626" />}
                    {log.action === 'reactivated' && <RefreshCw size={16} color="#2563eb" />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon size={13} color={isGrow ? '#059669' : '#d97706'} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{log.anchor_label_en}</Text>
                      <View style={{
                        paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
                        backgroundColor: isGrow ? '#dcfce7' : '#fef3c7',
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: isGrow ? '#059669' : '#d97706' }}>
                          {isGrow ? 'Grow' : 'Let Go'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {log.action === 'added' ? 'Added' : log.action === 'removed' ? 'Removed' : 'Reactivated'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151' }}>{formattedDate}</Text>
                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>{formattedTime}</Text>
                  </View>
                </View>
              )
            })}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#16a34a' }}>
                  {activityLogs.filter(l => l.action === 'added').length}
                </Text>
                <Text style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>Seeds added</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#dc2626' }}>
                  {activityLogs.filter(l => l.action === 'removed').length}
                </Text>
                <Text style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>Seeds removed</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <History size={36} color="#d1d5db" />
            <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8 }}>No recent activity</Text>
            <Text style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>Add or remove seeds to see history</Text>
          </View>
        )}
      </Card>
    </AnimatedSection>
  )
}
