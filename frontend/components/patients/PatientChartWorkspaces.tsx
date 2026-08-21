'use client'

// Re-export the real workspace implementations.
// The patient chart page imports these as named exports from this barrel.

export { PatientOrientacoesWorkspace } from './PatientOrientacoesWorkspace'
export { PatientDocumentosWorkspace } from './PatientDocumentosWorkspace'
export { PatientAntropometriaWorkspace } from './PatientAntropometriaWorkspace'
export { PatientExamesWorkspace } from './PatientExamesWorkspace'
export { PatientHistoricoConsultasWorkspace } from './PatientHistoricoConsultasWorkspace'
