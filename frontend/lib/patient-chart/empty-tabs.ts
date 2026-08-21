import {

  Baby,

  Brain,

  Calculator,

  ClipboardPlus,

  FolderOpen,

  Leaf,

  LineChart,

  Pill,

  ScrollText,

  ShoppingBasket,

  Sparkles,

  type LucideIcon,

} from 'lucide-react'

import type { ChartTabId } from '@/lib/patient-chart/nav'



export type ChartEmptyTabContent = {

  icon: LucideIcon

  title: string

  description: string

  actionLabel?: string

}



/** Abas ainda sem workspace completo — empty state alinhado ao Dietitian. */

export const PATIENT_CHART_EMPTY_TABS: Partial<Record<ChartTabId, ChartEmptyTabContent>> = {

  farmaco_nutrientes: {

    icon: Pill,

    title: 'Nenhum fármaco-nutriente registrado',

    description:

      'Cadastre interações e recomendações de fármaco-nutrientes para orientar o plano com segurança.',

    actionLabel: '+ Novo registro',

  },

  acompanhamento: {

    icon: LineChart,

    title: 'Comece o acompanhamento',

    description:

      'Registre a evolução clínica, adesão e pontos de atenção ao longo do tratamento.',

    actionLabel: '+ Novo acompanhamento',

  },

  avaliacao_integrada: {

    icon: Sparkles,

    title: 'Faça a primeira avaliação integrada',

    description:

      'Una anamnese, antropometria, exames e metas em uma visão completa do paciente.',

    actionLabel: '+ Nova avaliação',

  },

  gestacional: {

    icon: Baby,

    title: 'Sem acompanhamento gestacional',

    description:

      'Acompanhe semanas, peso e orientações específicas para pacientes gestantes.',

    actionLabel: '+ Iniciar acompanhamento',

  },

  gastos: {

    icon: Calculator,

    title: 'Calcule o primeiro gasto energético',

    description:

      'Registre o gasto energético do paciente para estimar necessidades calóricas e metas.',

    actionLabel: '+ Novo cálculo',

  },

  suplementos: {

    icon: ShoppingBasket,

    title: 'Nenhum suplemento ou produto',

    description:

      'Liste suplementos e produtos recomendados para a paciente acompanhar no dia a dia.',

    actionLabel: '+ Adicionar item',

  },

  prescricoes: {

    icon: Leaf,

    title: 'Nada prescrito por enquanto',

    description:

      'Cadastre fórmulas e manipulados para compartilhar a prescrição com a paciente.',

    actionLabel: '+ Nova prescrição',

  },

  arquivos: {

    icon: FolderOpen,

    title: 'Nenhum arquivo enviado ainda',

    description:

      'Armazene documentos, fotos e relatórios importantes com segurança.',

    actionLabel: '+ Adicionar arquivo',

  },

  questionarios: {

    icon: Brain,

    title: 'Crie questionários para seus pacientes',

    description:

      'Monte questionários de saúde para conduzir o atendimento com mais contexto.',

    actionLabel: '+ Novo questionário',

  },

  prontuario: {

    icon: ClipboardPlus,

    title: 'Prontuário ainda vazio',

    description:

      'Centralize evoluções, condutas e anotações clínicas do paciente em um só lugar.',

    actionLabel: '+ Nova anotação',

  },

  atestados: {

    icon: ScrollText,

    title: 'Nenhum atestado ou receituário',

    description:

      'Emita e organize atestados e receituários vinculados a esta paciente.',

    actionLabel: '+ Novo documento',

  },

}


