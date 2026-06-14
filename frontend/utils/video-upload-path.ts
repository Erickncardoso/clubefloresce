export function formatCloudinaryVideoPath(videoUrl: string): string {
  if (!videoUrl || !videoUrl.includes('res.cloudinary.com')) return videoUrl

  try {
    const parts = new URL(videoUrl).pathname.split('/').filter(Boolean)
    const uploadIdx = parts.indexOf('upload')
    if (uploadIdx === -1) return videoUrl

    let cursor = uploadIdx + 1
    if (parts[cursor]?.startsWith('v')) cursor += 1

    return parts.slice(cursor).join('/')
  } catch {
    return videoUrl
  }
}

export function buildLessonLocationPath(
  courseTitle?: string,
  moduleTitle?: string,
  lessonTitle?: string,
): string {
  return [courseTitle, moduleTitle, lessonTitle].filter(Boolean).join(' / ')
}
