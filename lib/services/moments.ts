import { supabase } from '@/lib/supabase'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'

// ============================================
// TYPES
// ============================================

export type MomentType = 'photo' | 'video' | 'voice' | 'write'

export interface Moment {
  id: string
  user_id: string
  type: MomentType
  media_url: string | null
  thumbnail_url: string | null
  text_content: string | null
  caption: string | null
  moods: string[]
  duration_seconds: number | null
  file_size_bytes: number | null
  mime_type: string | null
  created_at: string
  updated_at: string
}

export interface CreateMomentInput {
  type: MomentType
  mediaUri?: string
  mimeType?: string
  textContent?: string
  caption?: string
  moods: string[]
  durationSeconds?: number
}

// ============================================
// STORAGE HELPERS
// ============================================

async function uploadMomentMedia(
  userId: string,
  momentId: string,
  uri: string,
  mimeType: string,
): Promise<{ url: string | null; fileSize: number | null }> {
  // Determine file extension
  let extension = 'bin'
  if (mimeType.startsWith('image/')) {
    extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  } else if (mimeType.startsWith('video/')) {
    extension = mimeType.split('/')[1] || 'mp4'
  } else if (mimeType.startsWith('audio/')) {
    extension = mimeType.split('/')[1] || 'webm'
  }

  const fileName = `media.${extension}`
  const filePath = `${userId}/${momentId}/${fileName}`

  let fileBody: ArrayBuffer | Blob
  let fileSize: number | null = null

  if (Platform.OS === 'web') {
    // On web, fetch the blob from the URI
    const response = await fetch(uri)
    const blob = await response.blob()
    fileBody = blob
    fileSize = blob.size
  } else {
    // On native, read the file as base64 and convert to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    fileBody = bytes.buffer as ArrayBuffer
    fileSize = bytes.length
  }

  const { error } = await supabase.storage
    .from('moments_media')
    .upload(filePath, fileBody, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) {
    console.error('Error uploading moment media:', error)
    return { url: null, fileSize: null }
  }

  const { data: urlData } = supabase.storage
    .from('moments_media')
    .getPublicUrl(filePath)

  return { url: urlData.publicUrl, fileSize }
}

// ============================================
// MOMENT OPERATIONS
// ============================================

export async function createMoment(input: CreateMomentInput): Promise<Moment | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('No authenticated user')
    return null
  }

  const momentId = crypto.randomUUID()

  // Upload media if present
  let mediaUrl: string | null = null
  let mimeType: string | null = input.mimeType || null
  let fileSizeBytes: number | null = null

  if (input.mediaUri && input.mimeType) {
    const result = await uploadMomentMedia(user.id, momentId, input.mediaUri, input.mimeType)
    mediaUrl = result.url
    fileSizeBytes = result.fileSize
  }

  const { data, error } = await supabase
    .from('moments')
    .insert({
      id: momentId,
      user_id: user.id,
      type: input.type,
      media_url: mediaUrl,
      text_content: input.textContent || null,
      caption: input.caption || null,
      moods: input.moods,
      duration_seconds: input.durationSeconds || null,
      file_size_bytes: fileSizeBytes,
      mime_type: mimeType,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating moment:', error)
    return null
  }

  return data as Moment
}

export async function getMemberMoments(limit = 50, offset = 0, sinceDate?: Date): Promise<Moment[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('moments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (sinceDate) {
    query = query.gte('created_at', sinceDate.toISOString())
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching moments:', error)
    return []
  }

  return data as Moment[]
}

export async function deleteMoment(momentId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Delete media from storage
  const mediaPath = `${user.id}/${momentId}`
  const { data: files } = await supabase.storage
    .from('moments_media')
    .list(mediaPath)

  if (files && files.length > 0) {
    const filesToDelete = files.map(f => `${mediaPath}/${f.name}`)
    await supabase.storage.from('moments_media').remove(filesToDelete)
  }

  const { error } = await supabase
    .from('moments')
    .delete()
    .eq('id', momentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting moment:', error)
    return false
  }

  return true
}
