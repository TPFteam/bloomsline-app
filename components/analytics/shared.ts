import { Dimensions } from 'react-native'

export const SCREEN_WIDTH = Dimensions.get('window').width

export const POSITIVE_MOODS = ['grateful', 'peaceful', 'joyful', 'inspired', 'loved', 'calm', 'hopeful', 'proud']

export const MOOD_COLORS: Record<string, string> = {
  grateful: '#FFB347',
  peaceful: '#43D9BE',
  joyful: '#FFD60A',
  inspired: '#A855F7',
  loved: '#FF6B9D',
  calm: '#5BC4F6',
  hopeful: '#34D399',
  proud: '#FF7170',
  overwhelmed: '#E8853D',
  tired: '#94A3B8',
  uncertain: '#C4B5FD',
}

export const MOOD_HINTS: Record<string, string> = {
  grateful: 'Appreciation for what\'s good',
  peaceful: 'Inner calm and stillness',
  joyful: 'Pure happiness and delight',
  inspired: 'Sparked with new energy',
  loved: 'Feeling connected and cared for',
  calm: 'Settled and at ease',
  hopeful: 'Looking forward with optimism',
  proud: 'Recognizing your own growth',
  overwhelmed: 'When it all feels like a lot',
  tired: 'Your body asking for rest',
  uncertain: 'Navigating the unknown',
}

export function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getDominantMood(moments: { moods?: string[] }[]): string | null {
  const counts: Record<string, number> = {}
  moments.forEach(m => {
    m.moods?.forEach(mood => { counts[mood] = (counts[mood] || 0) + 1 })
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || null
}

export type Theme = Record<string, string>
