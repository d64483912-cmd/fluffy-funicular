import type { Citation } from '@/types/chat'

const MOCK_PARAGRAPHS = [
  'Most febrile neonates (<28 days) require full sepsis evaluation with blood, urine, and CSF cultures followed by empiric ampicillin plus gentamicin or cefotaxime. Clinical appearance is not sufficiently reliable at this age.',
  'Between 29–60 days, well-appearing infants with reassuring inflammatory markers (ANC <4000, procalcitonin <0.5 ng/mL) and negative urinalysis can be managed with shared decision-making and close follow-up rather than automatic hospitalization.',
  'Risk stratification should incorporate perinatal factors (prematurity, maternal infections), immunization status, and social reliability. Families should receive strict return precautions, hydration goals, and a clear review timeline within 24 hours.'
]

const MOCK_CITATIONS: Citation[] = [
  {
    id: '1',
    title: 'Evaluation of Fever in Infants',
    chapter: 'Ch. 12',
    page: '246-249',
    snippet: 'Neonates younger than 28 days require a complete sepsis evaluation regardless of clinical appearance.',
  },
  {
    id: '2',
    title: 'Risk Stratification Algorithms',
    chapter: 'Ch. 12',
    page: '250',
    snippet: 'Biomarker-guided outpatient management is reasonable in well-appearing 29–60 day infants with negative UA.',
  },
  {
    id: '3',
    title: 'Family Communication & Safety Netting',
    chapter: 'Ch. 2',
    page: '88',
    snippet: 'Explicit verbal and written return precautions reduce readmissions for febrile infants by 27%.',
  },
]

const FOLLOW_UPS = [
  'What labs best differentiate viral vs bacterial risk?',
  'How do I counsel parents about hydration goals?',
  'When can I resume routine vaccines after hospitalization?'
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function mockNelsonResponse(_prompt: string) {
  const tokens = MOCK_PARAGRAPHS.join('\n\n').split(' ')
  return {
    tokens,
    citations: MOCK_CITATIONS,
    followUps: FOLLOW_UPS,
    evidenceAligned: true,
  }
}
