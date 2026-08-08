import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Florescer · Admin (Next)',
}

export default function HomePage() {
  redirect('/dashboard')
}
