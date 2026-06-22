import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Link, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

type Props = {
  invoiceNumber: string
  amountFormatted: string
  dueDateFormatted: string
  hostedUrl: string
  pdfUrl?: string
  billingName?: string
  bankPayee: string
  bankSortCode: string
  bankAccount: string
  paymentReference: string
  supplierName: string
}

const Email = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {p.invoiceNumber} from {p.supplierName} — {p.amountFormatted} due {p.dueDateFormatted}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row><Column style={heroInner}>
            <Row style={brandRow}>
              <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
              <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
            </Row>
            <Text style={eyebrow}>INVOICE · {p.invoiceNumber}</Text>
            <Heading style={h1}>{p.amountFormatted} due {p.dueDateFormatted}</Heading>
            <Text style={intro}>
              {p.billingName ? `Hi ${p.billingName}, ` : 'Hi, '}your invoice from {p.supplierName} is attached as a PDF. You can also view, print or download it from the secure link below.
            </Text>
            <Button style={button} href={p.hostedUrl}>View invoice</Button>
          </Column></Row>
        </Section>

        <Section style={panel}><Row><Column style={panelInner}>
          <Text style={panelTitle}>How to pay — bank transfer (GBP)</Text>
          <Text style={text}>
            Please pay the full amount by bank transfer using the details below. <strong>Quote {p.paymentReference} as your payment reference</strong> so we can match it to your invoice.
          </Text>
          <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Payee</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.bankPayee}</Text></Column></Row>
          <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Sort code</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.bankSortCode}</Text></Column></Row>
          <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Account no.</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.bankAccount}</Text></Column></Row>
          <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Reference</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.paymentReference}</Text></Column></Row>
          <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Amount</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.amountFormatted}</Text></Column></Row>
          <Row style={detailRow}><Column style={labelColumn}><Text style={detailLabel}>Due by</Text></Column><Column style={valueColumn}><Text style={detailValue}>{p.dueDateFormatted}</Text></Column></Row>
        </Column></Row></Section>

        <Section><Row><Column style={nextInner}>
          <Text style={sectionKicker}>Need to pay by card instead?</Text>
          <Text style={text}>
            Open the invoice link above and choose <em>Pay by card</em> — we'll spin up a secure Stripe checkout for the exact amount.
          </Text>
          {p.pdfUrl ? (
            <Text style={smallLink}>Download PDF: <Link href={p.pdfUrl} style={inlineLink}>{p.pdfUrl}</Link></Text>
          ) : null}
          <Text style={smallLink}>Questions? Just reply to this email.</Text>
        </Column></Row></Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Invoice ${d.invoiceNumber ?? ''} from ${d.supplierName ?? 'Delabs Ltd'} — ${d.amountFormatted ?? ''}`,
  displayName: 'Invoice issued',
  previewData: {
    invoiceNumber: 'INV-2026-0001',
    amountFormatted: '£479.00',
    dueDateFormatted: '20 July 2026',
    hostedUrl: 'https://pixcellor.com/invoice/abc123',
    pdfUrl: 'https://pixcellor.com/invoice/abc123/pdf',
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
const brandRow = { margin: '0 0 28px' }
const brand = { color: '#ffffff', fontSize: '14px', fontWeight: '800' as const, margin: '0' }
const markColumn = { textAlign: 'right' as const, verticalAlign: 'top' as const, width: '46px' }
const mark = { display: 'block', margin: '0', width: '40px', height: '40px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', lineHeight: '1.4', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#ffffff', fontSize: '28px', fontWeight: '800' as const, lineHeight: '1.2', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '15px', lineHeight: '1.65', margin: '0 0 20px' }
const panel = {}
const panelInner = { padding: '24px 34px 12px' }
const panelTitle = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 10px' }
const detailRow = { borderTop: '1px solid #242424' }
const labelColumn = { width: '124px', verticalAlign: 'top' as const }
const valueColumn = { verticalAlign: 'top' as const }
const detailLabel = { color: '#969696', fontSize: '12px', fontWeight: '700' as const, lineHeight: '1.5', margin: '12px 0', textTransform: 'uppercase' as const }
const detailValue = { color: '#f5f5f5', fontSize: '14px', fontWeight: '700' as const, lineHeight: '1.5', margin: '12px 0', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const }
const nextInner = { padding: '20px 34px 30px' }
const sectionKicker = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 10px' }
const text = { color: '#d0d0d0', fontSize: '14px', lineHeight: '1.7', margin: '0 0 14px' }
const button = { backgroundColor: '#ffffff', borderRadius: '0', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '4px 0 0', padding: '13px 18px', textDecoration: 'none' }
const smallLink = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '8px 0 0', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const }
const inlineLink = { color: '#ffffff', fontWeight: '700' as const, textDecoration: 'underline' }
