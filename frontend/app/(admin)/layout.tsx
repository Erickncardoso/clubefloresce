import { AdminShell } from '@/components/layout/AdminShell'
import { AnamneseBackgroundProvider } from '@/components/patients/AnamneseBackgroundProvider'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <AnamneseBackgroundProvider>{children}</AnamneseBackgroundProvider>
    </AdminShell>
  )
}
