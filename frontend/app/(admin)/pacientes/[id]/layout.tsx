'use client'

import { Suspense, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { PatientChartProvider } from '@/lib/patient-chart/context'
import { PatientChartPageSkeleton } from '@/components/patients/PatientChartPageSkeleton'

function ProviderInner({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>()
  const patientId = params?.id || ''
  if (!patientId) return <>{children}</>
  return <PatientChartProvider patientId={patientId}>{children}</PatientChartProvider>
}

export default function PatientIdLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PatientChartPageSkeleton />}>
      <ProviderInner>{children}</ProviderInner>
    </Suspense>
  )
}
