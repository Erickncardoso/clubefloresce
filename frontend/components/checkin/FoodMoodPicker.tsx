'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import styles from './FoodMoodPicker.module.scss'

const NOTO_LOTTIE = 'https://fonts.gstatic.com/s/e/notoemoji/latest'

const FACES = [
  { value: 1, label: 'Muito ruim', lottie: `${NOTO_LOTTIE}/1f62b/lottie.json` },
  { value: 2, label: 'Ruim', lottie: `${NOTO_LOTTIE}/1f615/lottie.json` },
  { value: 3, label: 'Regular', lottie: `${NOTO_LOTTIE}/1f610/lottie.json` },
  { value: 4, label: 'Boa', lottie: `${NOTO_LOTTIE}/1f642/lottie.json` },
  { value: 5, label: 'Excelente', lottie: `${NOTO_LOTTIE}/1f604/lottie.json` },
]

type Props = {
  value?: number | null
  onChange: (value: number) => void
}

export function FoodMoodPicker({ value, onChange }: Props) {
  return (
    <div className={styles.picker} role="group" aria-label="Como foi sua alimentação hoje?">
      {FACES.map((face) => (
        <button
          key={face.value}
          type="button"
          className={`${styles.btn} ${value === face.value ? styles.selected : ''}`}
          aria-pressed={value === face.value}
          aria-label={face.label}
          onClick={() => onChange(face.value)}
        >
          <DotLottieReact
            className={styles.lottie}
            src={face.lottie}
            autoplay
            loop
            speed={value === face.value ? 1.15 : 1}
          />
        </button>
      ))}
    </div>
  )
}
