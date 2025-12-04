import type { QuickTool } from '@/types/chat'

export const quickTools: QuickTool[] = [
  {
    id: 'growth',
    title: 'Growth Percentiles',
    accent: 'amber',
    summary: 'WHO & CDC aligned percentiles',
    meta: '0–24 months',
    items: [
      { label: 'Length', value: '50th ▸ 62 cm', description: 'Average 4 mo infant' },
      { label: 'Weight', value: '75th ▸ 7.5 kg', description: 'Breast-fed trend' },
      { label: 'Head circ.', value: '60th ▸ 42 cm' },
    ],
    link: {
      label: 'Open calculator',
      href: 'https://www.cdc.gov/growthcharts'
    },
  },
  {
    id: 'vaccines',
    title: 'Vaccine Schedule',
    accent: 'sage',
    summary: 'ACIP 2024 pediatric updates',
    meta: 'Birth – 18 yrs',
    items: [
      { label: '6 months', value: 'DTaP • IPV • HepB' },
      { label: '12 months', value: 'MMR • Varicella', description: 'Co-admin ok' },
      { label: '16 yrs', value: 'MenACWY booster' },
    ],
    link: {
      label: 'View schedule',
      href: 'https://www.cdc.gov/vaccines/schedules/index.html'
    },
  },
  {
    id: 'dosing',
    title: 'Dosing Essentials',
    accent: 'mauve',
    summary: 'Weight-based safety guardrails',
    meta: 'mg/kg helpers',
    items: [
      { label: 'Acetaminophen', value: '10–15 mg/kg', description: 'Q4–6h • max 75 mg/kg/day' },
      { label: 'Ibuprofen', value: '10 mg/kg', description: 'Q6–8h • >6 mo only' },
      { label: 'Amoxicillin', value: '80–90 mg/kg/day', description: 'BID for AOM/S. pneumoniae' },
    ],
  },
]
