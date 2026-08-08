'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  getLessonVideoMetadata,
  getLessonVideoUrl,
  type BunnyVideoChapter,
  type CourseLesson,
} from '@/lib/courses'
import { extractYoutubeId } from '@/lib/course-slug'
import { resolvePlayableVideoSource } from '@/lib/video-playback'
import styles from './CourseVideoPlayer.module.scss'

type Props = {
  lesson: CourseLesson | null
  onTimeUpdate?: (t: number) => void
  seekTo?: number | null
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function getChapterAtTime(chapters: BunnyVideoChapter[], time: number) {
  if (!chapters.length) return null
  for (let i = chapters.length - 1; i >= 0; i -= 1) {
    if (time >= chapters[i].start) return chapters[i]
  }
  return chapters[0] || null
}

export function CourseVideoPlayer({ lesson, onTimeUpdate, seekTo = null }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const videoUrl = getLessonVideoUrl(lesson)
  const youtubeId = extractYoutubeId(videoUrl)
  const playback = useMemo(() => resolvePlayableVideoSource(videoUrl), [videoUrl])
  const isNativeVideo = playback.kind === 'hls' || playback.kind === 'mp4'

  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [muted, setMuted] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [chapters, setChapters] = useState<BunnyVideoChapter[]>([])
  const [barHover, setBarHover] = useState<{
    x: number
    time: number
    chapterTitle: string
  } | null>(null)

  const chapterDuration = duration || 0

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0

  const showControls = !playing || controlsVisible || hovering || Boolean(barHover)

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false)
      }
    }, 2400)
  }, [])

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  useEffect(() => {
    setChapters([])
    setReady(false)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setBarHover(null)

    if (!lesson?.id || youtubeId) return
    let cancelled = false
    void getLessonVideoMetadata(lesson.id)
      .then((result) => {
        if (cancelled || !result?.available || !result.metadata) return
        const list = Array.isArray(result.metadata.chapters) ? result.metadata.chapters : []
        setChapters(
          list
            .map((c) => ({
              title: String(c.title || '').trim(),
              start: Number(c.start) || 0,
              end: Number(c.end) || 0,
            }))
            .filter((c) => c.title)
            .sort((a, b) => a.start - b.start),
        )
        if (Number(result.metadata.length) > 0 && !duration) {
          setDuration(Number(result.metadata.length))
        }
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, youtubeId])

  useEffect(() => {
    if (!isNativeVideo || !playback.src || youtubeId) return

    let cancelled = false
    hlsRef.current?.destroy()
    hlsRef.current = null

    async function attachSource() {
      const video = videoRef.current
      if (!video || cancelled) return

      if (playback.useHls && /\.m3u8/i.test(playback.src)) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = playback.src
          return
        }
        try {
          const Hls = (await import('hls.js')).default
          if (cancelled || !Hls.isSupported()) {
            video.src = playback.fallbackSrc || playback.src
            return
          }
          const hls = new Hls({ enableWorker: true })
          hls.loadSource(playback.src)
          hls.attachMedia(video)
          hlsRef.current = hls
          return
        } catch {
          video.src = playback.fallbackSrc || playback.src
          return
        }
      }

      video.src = playback.src
    }

    void attachSource()
    return () => {
      cancelled = true
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [isNativeVideo, playback.src, playback.fallbackSrc, playback.useHls, youtubeId, lesson?.id])

  useEffect(() => {
    if (seekTo == null || !videoRef.current || youtubeId) return
    videoRef.current.currentTime = seekTo
    void videoRef.current.play().catch(() => null)
    revealControls()
  }, [seekTo, youtubeId, revealControls])

  useEffect(() => {
    function onFsChange() {
      setFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function emitTime(t: number) {
    setCurrentTime(t)
    onTimeUpdate?.(t)
  }

  function syncBuffered() {
    const video = videoRef.current
    if (!video || !video.buffered.length) return
    try {
      setBuffered(video.buffered.end(video.buffered.length - 1))
    } catch {
      /* ignore */
    }
  }

  async function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      try {
        await video.play()
      } catch {
        /* autoplay block */
      }
    } else {
      video.pause()
    }
    revealControls()
  }

  function seekRelative(delta: number) {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration)
    revealControls()
  }

  function seekToSeconds(seconds: number) {
    const video = videoRef.current
    if (!video) return
    const max = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : chapterDuration
    video.currentTime = Math.min(Math.max(0, seconds), max || seconds)
    void video.play().catch(() => null)
    revealControls()
  }

  function timeFromClientX(clientX: number) {
    const bar = barRef.current
    const video = videoRef.current
    const total = video?.duration || chapterDuration
    if (!bar || !total) return 0
    const rect = bar.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return ratio * total
  }

  function onBarPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    seekToSeconds(timeFromClientX(e.clientX))
  }

  function onBarPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const bar = barRef.current
    const total = videoRef.current?.duration || chapterDuration
    if (!bar || !total) return
    const rect = bar.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    const time = (x / rect.width) * total
    const chapter = getChapterAtTime(chapters, time)
    setBarHover({
      x,
      time,
      chapterTitle: chapter?.title || '',
    })
    if (e.buttons === 1) {
      seekToSeconds(time)
    }
  }

  async function toggleFullscreen() {
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => null)
    } else {
      await root.requestFullscreen?.().catch(() => null)
    }
    revealControls()
  }

  if (!lesson) {
    return (
      <div className={styles.empty}>
        <Play size={40} />
        <p>Selecione uma aula para assistir.</p>
      </div>
    )
  }

  if (youtubeId) {
    return (
      <div className={styles.wrap} ref={rootRef}>
        <iframe
          title={lesson.title}
          className={styles.youtube}
          src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  if (!isNativeVideo || !playback.src) {
    return (
      <div className={styles.empty}>
        <Play size={40} />
        <p>Esta aula ainda não possui vídeo configurado.</p>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.wrap} ${playing ? styles.playing : ''} ${showControls ? styles.controlsVisible : ''} ${hovering ? styles.hovering : ''} ${fullscreen ? styles.fullscreen : ''}`}
      onMouseEnter={() => {
        setHovering(true)
        revealControls()
      }}
      onMouseLeave={() => {
        setHovering(false)
        setBarHover(null)
        if (playing) scheduleHide()
      }}
      onMouseMove={revealControls}
    >
      <div className={styles.player} onClick={togglePlay}>
        <video
          key={lesson.id}
          ref={videoRef}
          className={styles.video}
          playsInline
          preload="metadata"
          poster={lesson.thumbnail || lesson.cover || undefined}
          onPlay={() => {
            setPlaying(true)
            scheduleHide()
          }}
          onPause={() => {
            setPlaying(false)
            setControlsVisible(true)
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0)
            setReady(true)
          }}
          onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => {
            emitTime(e.currentTarget.currentTime)
            syncBuffered()
          }}
          onProgress={syncBuffered}
          onWaiting={() => setReady(false)}
          onCanPlay={() => setReady(true)}
          onEnded={() => {
            setPlaying(false)
            setControlsVisible(true)
            emitTime(videoRef.current?.duration || 0)
          }}
        />

        {(!playing || !ready) && (
          <button
            type="button"
            className={`${styles.overlayPlay} ${!ready && playing ? styles.overlayLoading : ''}`}
            aria-label={playing ? 'Carregando' : 'Reproduzir'}
            onClick={(e) => {
              e.stopPropagation()
              void togglePlay()
            }}
          >
            {!ready && playing ? <span className={styles.spinner} /> : <Play size={36} fill="currentColor" />}
          </button>
        )}

        <div className={styles.controls} onClick={(e) => e.stopPropagation()}>
          <div
            ref={barRef}
            className={styles.bar}
            onPointerDown={onBarPointerDown}
            onPointerMove={onBarPointerMove}
            onPointerLeave={() => setBarHover(null)}
          >
            <div className={styles.track}>
              <div className={styles.buffered} style={{ width: `${bufferedPercent}%` }} />
              <div className={styles.progress} style={{ width: `${progressPercent}%` }}>
                <span className={styles.thumb} />
              </div>
              {chapters.length > 0 && chapterDuration > 0 && (
                <div className={styles.chapterMarks} aria-hidden="true">
                  {chapters.map((chapter, index) => (
                    <button
                      key={`chapter-${chapter.start}-${index}`}
                      type="button"
                      className={styles.chapterMark}
                      style={{ left: `${(chapter.start / chapterDuration) * 100}%` }}
                      title={chapter.title}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        seekToSeconds(chapter.start)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {barHover && (
              <div className={styles.barPreview} style={{ left: `${barHover.x}px` }}>
                {barHover.chapterTitle ? (
                  <p className={styles.barPreviewChapter}>{barHover.chapterTitle}</p>
                ) : null}
                <p className={styles.barPreviewTime}>{formatTime(barHover.time)}</p>
              </div>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.left}>
              <button type="button" className={styles.iconBtn} aria-label={playing ? 'Pausar' : 'Reproduzir'} onClick={() => void togglePlay()}>
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button type="button" className={styles.iconBtn} aria-label="Voltar 10s" onClick={() => seekRelative(-10)}>
                <RotateCcw size={16} />
              </button>
              <button type="button" className={styles.iconBtn} aria-label="Avançar 10s" onClick={() => seekRelative(10)}>
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={muted ? 'Ativar som' : 'Silenciar'}
                onClick={() => {
                  const video = videoRef.current
                  if (!video) return
                  video.muted = !video.muted
                  setMuted(video.muted)
                  revealControls()
                }}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <div className={styles.times}>
                <span>{formatTime(currentTime)}</span>
                <span className={styles.sep}>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className={styles.right}>
              {chapters.length > 0 && (
                <span className={styles.chapterBadge} title={getChapterAtTime(chapters, currentTime)?.title || ''}>
                  {getChapterAtTime(chapters, currentTime)?.title || 'Tópicos'}
                </span>
              )}
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                onClick={() => void toggleFullscreen()}
              >
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
