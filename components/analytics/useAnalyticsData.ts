import { useMemo } from 'react'
import type { Moment } from '@/lib/services/moments'
import { POSITIVE_MOODS, MOOD_COLORS, getDateKey, getDominantMood } from './shared'

export type WeekData = {
  label: string
  moodCounts: Record<string, number>
  total: number
}

export type StreakData = {
  current: number
  longest: number
}

export type TopDay = {
  date: string
  score: number
  count: number
  dominant: string | null
  snippet: string
}

export type TimeBucket = {
  label: string
  hours: number[]
  moments: Moment[]
  moodCounts: Record<string, number>
}

export type TypeDataItem = {
  type: string
  count: number
  moodCounts: Record<string, number>
  total: number
  topMood: string | undefined
}

export function useAnalyticsData(moments: Moment[]) {
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    moments.forEach(m => {
      m.moods?.forEach(mood => { counts[mood] = (counts[mood] || 0) + 1 })
    })
    return counts
  }, [moments])

  const sortedMoods = useMemo(() =>
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1]),
    [moodCounts]
  )

  const uniqueMoodCount = Object.keys(moodCounts).length

  const weeklyMoodData = useMemo<WeekData[]>(() => {
    const now = new Date()
    const weeks: WeekData[] = []
    for (let w = 0; w < 4; w++) {
      const weekEnd = new Date(now)
      weekEnd.setDate(weekEnd.getDate() - (w * 7))
      weekEnd.setHours(23, 59, 59, 999)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)
      const label = w === 0 ? 'This Week' : w === 1 ? 'Last Week' : `${w} Weeks Ago`
      const weekMoments = moments.filter(m => {
        const d = new Date(m.created_at)
        return d >= weekStart && d <= weekEnd
      })
      const counts: Record<string, number> = {}
      weekMoments.forEach(m => {
        m.moods?.forEach(mood => { counts[mood] = (counts[mood] || 0) + 1 })
      })
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      weeks.push({ label, moodCounts: counts, total })
    }
    return weeks
  }, [moments])

  const streakData = useMemo<StreakData>(() => {
    const byDate: Record<string, Moment[]> = {}
    moments.forEach(m => {
      const key = getDateKey(new Date(m.created_at))
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(m)
    })
    let current = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const key = getDateKey(d)
      const dayMoments = byDate[key]
      if (!dayMoments || dayMoments.length === 0) break
      const posCount = dayMoments.filter(m =>
        m.moods?.some(mood => POSITIVE_MOODS.includes(mood))
      ).length
      if (posCount / dayMoments.length >= 0.5) {
        current++
      } else {
        break
      }
      d.setDate(d.getDate() - 1)
    }
    const dates = Object.keys(byDate).sort()
    let longest = 0
    let run = 0
    for (let i = 0; i < dates.length; i++) {
      const dayMoments = byDate[dates[i]]
      const posCount = dayMoments.filter(m =>
        m.moods?.some(mood => POSITIVE_MOODS.includes(mood))
      ).length
      const isPositive = posCount / dayMoments.length >= 0.5
      let isConsecutive = true
      if (i > 0) {
        const prev = new Date(dates[i - 1])
        const curr = new Date(dates[i])
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
        if (diff > 1) isConsecutive = false
      }
      if (isPositive && (i === 0 || isConsecutive)) {
        run++
        longest = Math.max(longest, run)
      } else if (isPositive) {
        run = 1
      } else {
        run = 0
      }
    }
    return { current, longest }
  }, [moments])

  const topDays = useMemo<TopDay[]>(() => {
    const byDate: Record<string, Moment[]> = {}
    moments.forEach(m => {
      const key = getDateKey(new Date(m.created_at))
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(m)
    })
    return Object.entries(byDate)
      .map(([date, dayMoments]) => {
        const posCount = dayMoments.filter(m =>
          m.moods?.some(mood => POSITIVE_MOODS.includes(mood))
        ).length
        const score = posCount / dayMoments.length
        const dominant = getDominantMood(dayMoments)
        const snippet = dayMoments[0]?.text_content || dayMoments[0]?.caption || ''
        return { date, score, count: dayMoments.length, dominant, snippet }
      })
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score || b.count - a.count)
      .slice(0, 3)
  }, [moments])

  const timeBuckets = useMemo<TimeBucket[]>(() => {
    const buckets: TimeBucket[] = [
      { label: 'Morning', hours: [5, 6, 7, 8, 9, 10, 11], moments: [], moodCounts: {} },
      { label: 'Afternoon', hours: [12, 13, 14, 15, 16], moments: [], moodCounts: {} },
      { label: 'Evening', hours: [17, 18, 19, 20], moments: [], moodCounts: {} },
      { label: 'Night', hours: [21, 22, 23, 0, 1, 2, 3, 4], moments: [], moodCounts: {} },
    ]
    moments.forEach(m => {
      const h = new Date(m.created_at).getHours()
      const bucket = buckets.find(b => b.hours.includes(h))
      if (bucket) {
        bucket.moments.push(m)
        m.moods?.forEach(mood => {
          bucket.moodCounts[mood] = (bucket.moodCounts[mood] || 0) + 1
        })
      }
    })
    return buckets
  }, [moments])

  const peakBucketIndex = useMemo(() => {
    let maxCount = 0
    let maxIdx = 0
    timeBuckets.forEach((b, i) => {
      if (b.moments.length > maxCount) {
        maxCount = b.moments.length
        maxIdx = i
      }
    })
    return maxIdx
  }, [timeBuckets])

  const summary = useMemo(() => {
    const activeDays = new Set(moments.map(m => getDateKey(new Date(m.created_at)))).size
    const topMood = sortedMoods[0]?.[0]
    const totalMoments = moments.length
    const typeCounts: Record<string, number> = {}
    moments.forEach(m => { typeCounts[m.type] = (typeCounts[m.type] || 0) + 1 })
    const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const peakTime = timeBuckets[peakBucketIndex]?.label.toLowerCase()
    const typeVerb: Record<string, string> = {
      photo: 'photograph', video: 'film', voice: 'record', write: 'write about',
    }
    let text = `Over ${activeDays} day${activeDays !== 1 ? 's' : ''}, you've captured ${totalMoments} moment${totalMoments !== 1 ? 's' : ''}`
    if (topMood) text += `, with ${topMood} leading the way`
    text += '. '
    if (favoriteType && peakTime) {
      text += `You love to ${typeVerb[favoriteType] || favoriteType} your feelings, especially in the ${peakTime}. `
    }
    if (uniqueMoodCount >= 5) {
      text += `Naming ${uniqueMoodCount} different emotions is a quiet superpower.`
    } else if (uniqueMoodCount >= 3) {
      text += `You're building a beautiful emotional vocabulary.`
    }
    return text
  }, [moments, sortedMoods, timeBuckets, peakBucketIndex, uniqueMoodCount])

  const summaryGradient = useMemo<[string, string]>(() => {
    const c1 = MOOD_COLORS[sortedMoods[0]?.[0]] || '#10b981'
    const c2 = MOOD_COLORS[sortedMoods[1]?.[0]] || '#14b8a6'
    return [c1, c2]
  }, [sortedMoods])

  const shareQuote = useMemo(() => {
    const topMood = sortedMoods[0]?.[0]
    const totalMoments = moments.length
    const activeDays = new Set(moments.map(m => getDateKey(new Date(m.created_at)))).size
    const quotes: string[] = []
    if (uniqueMoodCount >= 5)
      quotes.push(`I've named ${uniqueMoodCount} different emotions. That's not overthinking — that's emotional fluency.`)
    if (topMood && POSITIVE_MOODS.includes(topMood))
      quotes.push(`My most felt emotion lately? ${topMood.charAt(0).toUpperCase() + topMood.slice(1)}. And I think that says something beautiful.`)
    if (topMood && !POSITIVE_MOODS.includes(topMood))
      quotes.push(`I've been sitting with ${topMood} a lot lately. Naming it is the first step to understanding it.`)
    if (activeDays >= 7)
      quotes.push(`${activeDays} days of showing up for myself. Consistency is its own kind of courage.`)
    if (totalMoments >= 50)
      quotes.push(`${totalMoments} moments captured. That's ${totalMoments} times I chose to pay attention to how I feel.`)
    if (streakData.current >= 3)
      quotes.push(`${streakData.current}-day positivity streak. Not forcing it — just noticing the good.`)
    if (uniqueMoodCount >= 3 && uniqueMoodCount < 5)
      quotes.push(`${uniqueMoodCount} emotions, all valid. My emotional vocabulary is growing.`)
    if (quotes.length === 0)
      quotes.push('Every feeling I name makes me a little stronger.')
    return quotes[totalMoments % quotes.length]
  }, [moments, sortedMoods, uniqueMoodCount, streakData])

  const typeData = useMemo<TypeDataItem[]>(() => {
    const types = ['photo', 'video', 'voice', 'write']
    return types.map(type => {
      const typeMoments = moments.filter(m => m.type === type)
      const counts: Record<string, number> = {}
      typeMoments.forEach(m => {
        m.moods?.forEach(mood => { counts[mood] = (counts[mood] || 0) + 1 })
      })
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
      return { type, count: typeMoments.length, moodCounts: counts, total, topMood }
    }).filter(t => t.count > 0)
  }, [moments])

  return {
    moodCounts,
    sortedMoods,
    uniqueMoodCount,
    weeklyMoodData,
    streakData,
    topDays,
    timeBuckets,
    peakBucketIndex,
    summary,
    summaryGradient,
    shareQuote,
    typeData,
  }
}
