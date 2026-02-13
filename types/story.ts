// Story types for member content creation

// Content block types
export type ContentBlockType =
  | 'text'
  | 'heading'
  | 'list'
  | 'media'
  | 'divider'

export interface ContentBlock {
  id: string
  type: ContentBlockType
  content: any // Type varies based on block type
  order: number
}

// Specific block content types
export interface TextBlockContent {
  text: string
}

export interface HeadingBlockContent {
  text: string
  level: 1 | 2 | 3
}

export interface ListBlockContent {
  items: string[]
  ordered: boolean
}

export interface MediaItem {
  url: string
  fileType: 'image' | 'video' | 'audio'
  fileName: string
  alt?: string
}

export interface MediaBlockContent {
  items: MediaItem[]
  caption?: string
}

export interface Story {
  id: string
  user_id: string
  title: string
  content: ContentBlock[] // Changed from string to ContentBlock array
  media_urls: MediaFile[]
  published: boolean
  unique_slug: string
  secret_code?: string | null // Optional secret code for private stories
  created_at: string
  updated_at: string
}

export interface MediaFile {
  url: string
  type: 'image' | 'video' | 'other'
  name: string
  size?: number
}

export interface StoryInsert {
  user_id: string
  title: string
  content?: ContentBlock[]
  media_urls?: MediaFile[]
  published?: boolean
  unique_slug: string
  secret_code?: string | null
}

export interface StoryUpdate {
  title?: string
  content?: ContentBlock[]
  media_urls?: MediaFile[]
  published?: boolean
  secret_code?: string | null
}

// Helper function to generate unique slug
export function generateSlug(title: string, userId?: string): string {
  // Clean and shorten the title
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) // Limit to 50 characters

  // Create a more unique suffix using timestamp + random
  const timestamp = Date.now().toString(36) // Base36 timestamp
  const random = Math.random().toString(36).substring(2, 7) // 5 random chars

  // Optional: Include first 4 chars of user ID for extra uniqueness
  const userPrefix = userId ? userId.substring(0, 4) : ''

  // Format: title-timestamp-random or title-user-timestamp-random
  if (userPrefix) {
    return `${cleanTitle}-${userPrefix}-${timestamp}-${random}`
  }

  return `${cleanTitle}-${timestamp}-${random}`
}

// Helper function to generate short slug (for easy sharing)
export function generateShortSlug(): string {
  // Generate a short 8-character ID (62^8 = 218+ trillion combinations)
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Helper function to validate slug uniqueness (use in API)
export async function isSlugUnique(slug: string, supabaseClient: any): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('stories')
    .select('id')
    .eq('unique_slug', slug)
    .single()

  return !data && error?.code === 'PGRST116' // PGRST116 = not found
}

// Helper to retry slug generation if collision occurs
export async function generateUniqueSlug(
  title: string,
  supabaseClient: any,
  userId?: string,
  maxRetries: number = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const slug = generateSlug(title, userId)
    const isUnique = await isSlugUnique(slug, supabaseClient)
    if (isUnique) return slug
  }

  // Fallback to short slug if all retries fail
  return generateShortSlug()
}

// Helper function to validate media file type
export function isValidMediaType(type: string): type is MediaFile['type'] {
  return type === 'image' || type === 'video' || type === 'other'
}
