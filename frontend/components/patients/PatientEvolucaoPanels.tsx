'use client'

import { useEffect, useState } from 'react'
import { Camera, Target } from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  fetchFoodDiaryPhotos,
  fetchPatientGoals,
  type GoalItem,
  type PhotoEntry,
} from '@/lib/patient-chart/evolucao'
import styles from './PatientEvolucaoPanels.module.scss'

type NutritionProps = {
  patientId: string
  compact?: boolean
  showLinks?: boolean
  onNavigateEvolucao?: (sub: string) => void
}

export function PatientNutritionSection({
  patientId,
  compact = false,
  showLinks = false,
  onNavigateEvolucao,
}: NutritionProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [p, g] = await Promise.all([
          fetchFoodDiaryPhotos(patientId, compact ? 8 : 12),
          fetchPatientGoals(patientId),
        ])
        if (!alive) return
        setPhotos(p)
        setGoals(g.goals)
      } catch (err) {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar nutrição.')
      }
    })()
    return () => {
      alive = false
    }
  }, [patientId, compact])

  return (
    <section className={`${styles.nutrition} ${compact ? styles.compact : ''}`}>
      <div className={styles.nutritionCol}>
        <header className={styles.nutritionHead}>
          <h4>
            <Camera size={14} aria-hidden /> Fotos recentes
          </h4>
          {showLinks ? (
            <button type="button" className={styles.linkBtn} onClick={() => onNavigateEvolucao?.('fotos')}>
              Ver todas
            </button>
          ) : null}
        </header>
        {error ? <p className={styles.err}>{error}</p> : null}
        {!photos.length ? (
          <p className={styles.empty}>Nenhuma foto ainda.</p>
        ) : (
          <div className={styles.photoGrid}>
            {photos.map((photo) => (
              <figure key={photo.id} className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.imageUrl || ''} alt={photo.mealLabel || 'Refeição'} loading="lazy" />
                <figcaption>{photo.mealLabel || photo.mealType || 'Refeição'}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className={styles.nutritionCol}>
        <header className={styles.nutritionHead}>
          <h4>
            <Target size={14} aria-hidden /> Metas
          </h4>
          {showLinks ? (
            <button type="button" className={styles.linkBtn} onClick={() => onNavigateEvolucao?.('metas')}>
              Abrir
            </button>
          ) : null}
        </header>
        {!goals.length ? (
          <p className={styles.empty}>Nenhuma meta cadastrada.</p>
        ) : (
          <ul className={styles.goalList}>
            {goals.slice(0, compact ? 4 : 8).map((goal) => (
              <li key={goal.id}>
                <strong>{goal.label}</strong>
                <span>
                  {goal.target != null ? `${goal.target}${goal.unit ? ` ${goal.unit}` : ''}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

type GoalsProps = {
  patientId: string
  nutritionTarget?: unknown
}

export function PatientGoalsPanel({ patientId }: GoalsProps) {
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchPatientGoals(patientId)
        if (!alive) return
        setGoals(data.goals)
      } catch (err) {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar metas.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [patientId])

  if (loading) return <p className={styles.empty}>Carregando metas…</p>
  if (error) return <p className={styles.err}>{error}</p>
  if (!goals.length) return <p className={styles.empty}>Nenhuma meta cadastrada para este paciente.</p>

  return (
    <ul className={styles.goalListFull}>
      {goals.map((goal) => (
        <li key={goal.id}>
          <div>
            <strong>{goal.label}</strong>
            <p>
              {goal.type || 'Meta'}
              {goal.frequency ? ` · ${goal.frequency}` : ''}
            </p>
          </div>
          <span>
            {goal.target != null ? `${goal.target}${goal.unit ? ` ${goal.unit}` : ''}` : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

type PhotosProps = {
  patientId: string
}

export function PatientPhotosPanel({ patientId }: PhotosProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchFoodDiaryPhotos(patientId, 60)
        if (!alive) return
        setPhotos(data)
      } catch (err) {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar fotos.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [patientId])

  if (loading) return <p className={styles.empty}>Carregando fotos…</p>
  if (error) return <p className={styles.err}>{error}</p>
  if (!photos.length) return <p className={styles.empty}>Nenhuma foto de refeição ainda.</p>

  return (
    <div className={styles.photoGridLarge}>
      {photos.map((photo) => (
        <figure key={photo.id} className={styles.photoCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.imageUrl || ''} alt={photo.mealLabel || 'Refeição'} loading="lazy" />
          <figcaption>
            <strong>{photo.mealLabel || photo.mealType || 'Refeição'}</strong>
            <span>
              {photo.entryDate
                ? new Date(`${photo.entryDate}T12:00:00`).toLocaleDateString('pt-BR')
                : '—'}
              {photo.caloriesKcal != null ? ` · ${Math.round(photo.caloriesKcal)} kcal` : ''}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
