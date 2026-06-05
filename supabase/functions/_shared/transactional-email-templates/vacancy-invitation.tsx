import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Props = {
  candidateName?: string
  vacancyTitle?: string
  clientName?: string
  location?: string
  startDate?: string
  endDate?: string
  startTime?: string
  finishTime?: string
  scheduleDays?: string[]
  payMin?: number
  payMax?: number
  payCurrency?: string
  payPeriod?: string
  description?: string
  customMessage?: string
  confirmUrl?: string
  declineUrl?: string
}

const Email = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New opportunity: ${p.vacancyTitle ?? 'role'} with ${p.clientName ?? ''}`}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Text style={brand}>Pixcellor™</Text>
          <Text style={eyebrow}>NEW OPPORTUNITY</Text>
          <Heading style={h1}>{p.vacancyTitle ?? 'A new role for you'}</Heading>
          {p.clientName ? <Text style={subline}>with {p.clientName}{p.location ? ` · ${p.location}` : ''}</Text> : null}
        </Section>

        <Section style={panel}>
          <Text style={text}>Hi {p.candidateName ?? 'there'},</Text>
          <Text style={text}>We think you'd be a great fit for this role. Please confirm or decline below.</Text>

          {p.customMessage ? <Text style={text}>{p.customMessage}</Text> : null}

          <Section style={detailsBox}>
            {(p.startDate || p.endDate) ? <Text style={detailLine}><b>Dates:</b> {p.startDate ?? '?'} → {p.endDate ?? 'ongoing'}</Text> : null}
            {(p.startTime || p.finishTime) ? <Text style={detailLine}><b>Hours:</b> {p.startTime ?? '?'}–{p.finishTime ?? '?'}</Text> : null}
            {p.scheduleDays && p.scheduleDays.length ? <Text style={detailLine}><b>Days:</b> {p.scheduleDays.join(', ')}</Text> : null}
            {(p.payMin || p.payMax) ? <Text style={detailLine}><b>Pay:</b> {p.payCurrency ?? 'GBP'} {p.payMin ?? '?'}–{p.payMax ?? '?'} / {p.payPeriod ?? 'year'}</Text> : null}
            {p.description ? <Text style={detailLine}>{p.description}</Text> : null}
          </Section>

          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={p.confirmUrl} style={btnPrimary}>Confirm attendance</Button>
          </Section>
          <Section style={{ textAlign: 'center', margin: '6px 0' }}>
            <Button href={p.declineUrl} style={btnSecondary}>Not available</Button>
          </Section>

          <Text style={fine}>This invitation expires in 30 days. If the buttons don't work, copy this link: {p.confirmUrl}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `New role: ${d.vacancyTitle ?? 'opportunity'}${d.clientName ? ' with ' + d.clientName : ''}`,
  displayName: 'Vacancy invitation',
  previewData: { candidateName: 'Sam', vacancyTitle: 'Senior React Developer', clientName: 'Acme Co', location: 'London', startDate: '2026-07-01', startTime: '09:00', finishTime: '17:30', scheduleDays: ['Mon','Tue','Wed','Thu','Fri'], payMin: 60000, payMax: 80000, payCurrency: 'GBP', payPeriod: 'year', confirmUrl: 'https://pixcellor.com/vacancy/respond?token=demo&action=confirm', declineUrl: 'https://pixcellor.com/vacancy/respond?token=demo&action=decline' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '44px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', maxWidth: '620px' }
const hero = { borderBottom: '1px solid #202020', padding: '34px 34px 26px' }
const brand = { color: '#fff', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 24px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#fff', fontSize: '26px', fontWeight: '800' as const, lineHeight: '1.15', margin: '0' }
const subline = { color: '#a3a3a3', fontSize: '14px', margin: '8px 0 0' }
const panel = { padding: '24px 34px 28px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '12px 0 0' }
const detailsBox = { backgroundColor: '#0f0f0f', border: '1px solid #1f1f1f', padding: '14px 16px', margin: '18px 0' }
const detailLine = { color: '#d0d0d0', fontSize: '14px', lineHeight: '1.6', margin: '4px 0' }
const btnPrimary = { backgroundColor: '#ffffff', color: '#000000', padding: '12px 26px', fontSize: '14px', fontWeight: '800' as const, textDecoration: 'none', display: 'inline-block' }
const btnSecondary = { backgroundColor: 'transparent', color: '#a3a3a3', border: '1px solid #2a2a2a', padding: '10px 22px', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }
const fine = { color: '#666', fontSize: '11px', lineHeight: '1.6', margin: '20px 0 0', wordBreak: 'break-all' as const }
