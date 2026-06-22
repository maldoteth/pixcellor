import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Link, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Props = {
  invoiceNumber: string
  amountFormatted: string
  paidDateFormatted: string
  billingName?: string
  hostedUrl: string
  supplierName: string
  paymentReference?: string
}

const Email = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — thanks for paying {p.invoiceNumber}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}><Row><Column style={heroInner}>
          <Text style={brand}>Pixcellor™</Text>
          <Text style={eyebrow}>PAYMENT RECEIVED · {p.invoiceNumber}</Text>
          <Heading style={h1}>Thanks{p.billingName ? `, ${p.billingName}` : ''} — payment received</Heading>
          <Text style={intro}>
            We've received {p.amountFormatted} for invoice {p.invoiceNumber} on {p.paidDateFormatted}. The invoice is now marked as paid in full and we're kicking off the next steps on your project.
          </Text>
          <Button style={button} href={p.hostedUrl}>View receipt</Button>
        </Column></Row></Section>

        <Section><Row><Column style={panelInner}>
          <Text style={panelTitle}>What happens next</Text>
          <Text style={text}>You'll hear from us within one working day to confirm timelines and gather anything we still need. If you have any questions in the meantime, just reply to this email.</Text>
          {p.paymentReference ? (
            <Text style={smallLink}>Payment reference recorded: <strong>{p.paymentReference}</strong></Text>
          ) : null}
          <Text style={smallLink}>You can keep this receipt for your records or download it again from the <Link href={p.hostedUrl} style={inlineLink}>invoice page</Link>.</Text>
        </Column></Row></Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Payment received — ${d.invoiceNumber} (${d.amountFormatted})`,
  displayName: 'Invoice paid receipt',
  previewData: {
    invoiceNumber: 'INV-2026-0001',
    amountFormatted: '£479.00',
    paidDateFormatted: '24 June 2026',
    billingName: 'Jane Doe',
    hostedUrl: 'https://pixcellor.com/invoice/abc123',
    supplierName: 'Delabs Ltd',
    paymentReference: 'INV-2026-0001',
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
const text = { color: '#d0d0d0', fontSize: '14px', lineHeight: '1.7', margin: '0 0 14px' }
const button = { backgroundColor: '#ffffff', borderRadius: '0', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '4px 0 0', padding: '13px 18px', textDecoration: 'none' }
const smallLink = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '8px 0 0' }
const inlineLink = { color: '#ffffff', fontWeight: '700' as const, textDecoration: 'underline' }
