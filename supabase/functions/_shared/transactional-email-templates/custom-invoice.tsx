import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Link, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

type CustomInvoiceProps = {
  description?: string
  amountFormatted?: string
  paymentUrl?: string
  orderId?: string
  customerEmail?: string
}

const CustomInvoiceEmail = ({ description, amountFormatted, paymentUrl, orderId, customerEmail }: CustomInvoiceProps) => {
  const payHref = paymentUrl || 'https://pixcellor.com'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your invoice from Pixcellor — {amountFormatted || ''}</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={hero}>
            <Row>
              <Column style={heroInner}>
                <Row style={brandRow}>
                  <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
                  <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
                </Row>
                <Text style={eyebrow}>INVOICE</Text>
                <Heading style={h1}>Your custom invoice is ready</Heading>
                <Text style={intro}>
                  Below are the details for your custom order. You can pay securely via Stripe using the button below.
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={panel}>
            <Row>
              <Column style={panelInner}>
                <Text style={panelTitle}>Invoice details</Text>
                {description && (
                  <Row style={detailRow}>
                    <Column style={labelColumn}><Text style={detailLabel}>Item</Text></Column>
                    <Column style={valueColumn}><Text style={detailValue}>{description}</Text></Column>
                  </Row>
                )}
                {amountFormatted && (
                  <Row style={detailRow}>
                    <Column style={labelColumn}><Text style={detailLabel}>Amount</Text></Column>
                    <Column style={valueColumn}><Text style={detailValue}>{amountFormatted}</Text></Column>
                  </Row>
                )}
                {orderId && (
                  <Row style={detailRow}>
                    <Column style={labelColumn}><Text style={detailLabel}>Order ID</Text></Column>
                    <Column style={valueColumn}><Text style={detailValue}>{orderId}</Text></Column>
                  </Row>
                )}
                {customerEmail && (
                  <Row style={detailRow}>
                    <Column style={labelColumn}><Text style={detailLabel}>Email</Text></Column>
                    <Column style={valueColumn}><Text style={detailValue}><Link href={`mailto:${customerEmail}`} style={inlineLink}>{customerEmail}</Link></Text></Column>
                  </Row>
                )}
              </Column>
            </Row>
          </Section>

          <Section style={nextPanel}>
            <Row>
              <Column style={nextInner}>
                <Text style={sectionKicker}>Pay securely</Text>
                <Text style={text}>
                  Click the button to complete payment via our secure Stripe checkout. Once paid, we'll be in touch to kick things off.
                </Text>
                <Button style={button} href={payHref}>Pay now</Button>
                <Text style={smallLink}>
                  Or copy this link: <Link href={payHref} style={inlineLink}>{payHref}</Link>
                </Text>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CustomInvoiceEmail,
  subject: 'Your invoice from Pixcellor',
  displayName: 'Custom invoice',
  previewData: {
    description: 'Custom website build — homepage redesign',
    amountFormatted: '£450.00',
    paymentUrl: 'https://buy.stripe.com/test_abc123',
    orderId: 'PXC-ABCD-1234',
    customerEmail: 'client@example.com',
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
const h1 = { color: '#ffffff', fontSize: '30px', fontWeight: '800' as const, lineHeight: '1.15', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0' }
const panel = {}
const panelInner = { padding: '28px 34px 12px' }
const panelTitle = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 14px' }
const detailRow = { borderTop: '1px solid #242424' }
const labelColumn = { width: '124px', verticalAlign: 'top' as const }
const valueColumn = { verticalAlign: 'top' as const }
const detailLabel = { color: '#969696', fontSize: '12px', fontWeight: '700' as const, lineHeight: '1.5', margin: '12px 0', textTransform: 'uppercase' as const }
const detailValue = { color: '#f5f5f5', fontSize: '14px', fontWeight: '600' as const, lineHeight: '1.5', margin: '12px 0', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const }
const nextPanel = {}
const nextInner = { padding: '20px 34px 30px' }
const sectionKicker = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 10px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '0 0 16px' }
const button = { backgroundColor: '#ffffff', borderRadius: '0', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '2px 0 14px', padding: '13px 18px', textDecoration: 'none' }
const smallLink = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '8px 0 0', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const }
const linkText = { color: '#ffffff', fontWeight: '700' as const, textDecoration: 'underline' }
const inlineLink = { color: '#ffffff', fontWeight: '700' as const, textDecoration: 'underline' }
