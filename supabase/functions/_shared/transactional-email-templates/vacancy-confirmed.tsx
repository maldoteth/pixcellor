import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
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
}

const Email = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're booked: {p.vacancyTitle}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Text style={brand}>Pixcellor™</Text>
          <Text style={eyebrow}>BOOKING CONFIRMED</Text>
          <Heading style={h1}>You're all set, {p.candidateName ?? 'there'}.</Heading>
        </Section>
        <Section style={panel}>
          <Text style={text}>Thanks for confirming. Your placement details are below — you'll see this shift in your candidate calendar.</Text>
          <Section style={box}>
            <Text style={line}><b>Role:</b> {p.vacancyTitle}</Text>
            {p.clientName ? <Text style={line}><b>Client:</b> {p.clientName}</Text> : null}
            {p.location ? <Text style={line}><b>Location:</b> {p.location}</Text> : null}
            {(p.startDate || p.endDate) ? <Text style={line}><b>Dates:</b> {p.startDate ?? '?'} → {p.endDate ?? 'ongoing'}</Text> : null}
            {(p.startTime || p.finishTime) ? <Text style={line}><b>Hours:</b> {p.startTime ?? '?'}–{p.finishTime ?? '?'}</Text> : null}
            {p.scheduleDays && p.scheduleDays.length ? <Text style={line}><b>Days:</b> {p.scheduleDays.join(', ')}</Text> : null}
          </Section>
          <Text style={text}>Need to make a change? Reply to this email and our team will help.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Booking confirmed: ${d.vacancyTitle ?? 'your shift'}`,
  displayName: 'Vacancy confirmed',
  previewData: { candidateName: 'Sam', vacancyTitle: 'Senior React Developer', clientName: 'Acme Co' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '44px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', maxWidth: '620px' }
const hero = { borderBottom: '1px solid #202020', padding: '34px 34px 26px' }
const brand = { color: '#fff', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 24px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#fff', fontSize: '26px', fontWeight: '800' as const, lineHeight: '1.15', margin: '0' }
const panel = { padding: '24px 34px 28px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '12px 0 0' }
const box = { backgroundColor: '#0f0f0f', border: '1px solid #1f1f1f', padding: '14px 16px', margin: '18px 0' }
const line = { color: '#d0d0d0', fontSize: '14px', lineHeight: '1.6', margin: '4px 0' }
