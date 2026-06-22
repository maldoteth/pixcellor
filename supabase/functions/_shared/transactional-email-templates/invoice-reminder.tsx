import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Link, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Stage = 'friendly' | 'second' | 'overdue' | 'final'

type Props = {
  stage: Stage
  invoiceNumber: string
  amountFormatted: string
  dueDateFormatted: string
  daysSinceIssue: number
  daysOverdue: number
  hostedUrl: string
  billingName?: string
  bankPayee: string
  bankSortCode: string
  bankAccount: string
  paymentReference: string
  supplierName: string
}

const STAGE_COPY: Record<Stage, { eyebrow: string; heading: (p: Props) => string; body: (p: Props) => string }> = {
  friendly: {
    eyebrow: 'FRIENDLY REMINDER',
    heading: (p) => `Just a quick nudge on invoice ${p.invoiceNumber}`,
    body: (p) => `Hope all's well${p.billingName ? `, ${p.billingName}` : ''}. This is a friendly reminder that invoice ${p.invoiceNumber} for ${p.amountFormatted} is due on ${p.dueDateFormatted}. If you've already sent payment, please ignore — bank transfers can take a day or two to land.`,
  },
  second: {
    eyebrow: 'PAYMENT REMINDER',
    heading: (p) => `Reminder: invoice ${p.invoiceNumber} is due in 1 week`,
    body: (p) => `Just a quick check-in${p.billingName ? `, ${p.billingName}` : ''}. Invoice ${p.invoiceNumber} for ${p.amountFormatted} is due on ${p.dueDateFormatted}. Please arrange the bank transfer using the details below if you haven't already.`,
  },
  overdue: {
    eyebrow: 'NOW OVERDUE',
    heading: (p) => `Invoice ${p.invoiceNumber} is now overdue`,
    body: (p) => `Invoice ${p.invoiceNumber} for ${p.amountFormatted} was due on ${p.dueDateFormatted} and is now overdue. Please settle it as soon as possible to avoid any disruption to your project. If you're having any trouble paying, just reply — we'll work something out.`,
  },
  final: {
    eyebrow: 'FINAL NOTICE',
    heading: (p) => `Final notice — invoice ${p.invoiceNumber}`,
    body: (p) => `Invoice ${p.invoiceNumber} for ${p.amountFormatted} is now ${p.daysOverdue} days overdue. This is our final automated reminder before we escalate. Please pay using the bank details below, or reply to this email so we can resolve it together.`,
  },
}

const Email = (p: Props) => {
  const copy = STAGE_COPY[p.stage] ?? STAGE_COPY.friendly
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Reminder — invoice {p.invoiceNumber} for {p.amountFormatted}</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={hero}><Row><Column style={heroInner}>
            <Text style={brand}>Pixcellor™</Text>
            <Text style={eyebrow}>{copy.eyebrow} · {p.invoiceNumber}</Text>
            <Heading style={h1}>{copy.heading(p)}</Heading>
            <Text style={intro}>{copy.body(p)}</Text>
            <Button style={button} href={p.hostedUrl}>View invoice</Button>
          </Column></Row></Section>

          <Section><Row><Column style={panelInner}>
            <Text style={panelTitle}>Bank transfer details (GBP)</Text>
            <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Payee</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.bankPayee}</Text></Column></Row>
            <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Sort code</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.bankSortCode}</Text></Column></Row>
            <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Account no.</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.bankAccount}</Text></Column></Row>
            <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Reference</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.paymentReference}</Text></Column></Row>
            <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Amount</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.amountFormatted}</Text></Column></Row>
            <Text style={smallLink}>Or pay by card — open the <Link href={p.hostedUrl} style={inlineLink}>invoice page</Link> and choose "Pay by card".</Text>
          </Column></Row></Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const stage = d.stage as Stage
    if (stage === 'overdue') return `Overdue — invoice ${d.invoiceNumber}`
    if (stage === 'final') return `Final notice — invoice ${d.invoiceNumber}`
    if (stage === 'second') return `Reminder — invoice ${d.invoiceNumber} due ${d.dueDateFormatted}`
    return `Reminder — invoice ${d.invoiceNumber}`
  },
  displayName: 'Invoice reminder',
  previewData: {
    stage: 'overdue',
    invoiceNumber: 'INV-2026-0001',
    amountFormatted: '£479.00',
    dueDateFormatted: '20 July 2026',
    daysSinceIssue: 30,
    daysOverdue: 2,
    hostedUrl: 'https://pixcellor.com/invoice/abc123',
    billingName: 'Jane Doe',
    bankPayee: 'Delabs Ltd',
    bankSortCode: '60-84-64',
    bankAccount: '86111053',
    paymentReference: 'INV-2026-0001',
    supplierName: 'Delabs Ltd',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '44px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', maxWidth: '620px' }
const hero = { borderBottom: '1px solid #202020' }
const heroInner = { padding: '34px 34px 26px' }
const brand = { color: '#ffffff', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 18px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', lineHeight: '1.4', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#ffffff', fontSize: '26px', fontWeight: '800' as const, lineHeight: '1.2', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '15px', lineHeight: '1.65', margin: '0 0 20px' }
const panelInner = { padding: '24px 34px 30px' }
const panelTitle = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 10px' }
const detailRow = { borderTop: '1px solid #242424' }
const labelColumn = { width: '124px', verticalAlign: 'top' as const }
const valueColumn = { verticalAlign: 'top' as const }
const detailLabel = { color: '#969696', fontSize: '12px', fontWeight: '700' as const, lineHeight: '1.5', margin: '12px 0', textTransform: 'uppercase' as const }
const detailValue = { color: '#f5f5f5', fontSize: '14px', fontWeight: '700' as const, lineHeight: '1.5', margin: '12px 0' }
const button = { backgroundColor: '#ffffff', borderRadius: '0', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '4px 0 0', padding: '13px 18px', textDecoration: 'none' }
const smallLink = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '12px 0 0' }
const inlineLink = { color: '#ffffff', fontWeight: '700' as const, textDecoration: 'underline' }
