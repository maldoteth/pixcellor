import * as React from 'npm:react@18.3.1'
import { Body, Column, Container, Head, Heading, Html, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CustomerLeadProps {
  customerWebsiteName?: string
  leadName?: string
  leadEmail?: string
  leadPhone?: string
  leadMessage?: string
  receivedAt?: string
}

const DetailRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null
  return (
    <Row style={detailRow}>
      <Column style={labelColumn}><Text style={detailLabel}>{label}</Text></Column>
      <Column style={valueColumn}><Text style={detailValue}>{value}</Text></Column>
    </Row>
  )
}

const CustomerLeadEmail = ({ customerWebsiteName, leadName, leadEmail, leadPhone, leadMessage, receivedAt }: CustomerLeadProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New lead from your website</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row>
            <Column style={heroInner}>
              <Text style={brand}>{customerWebsiteName || 'Your website'}</Text>
              <Text style={eyebrow}>NEW ENQUIRY</Text>
              <Heading style={h1}>You've got a new lead</Heading>
              <Text style={intro}>Someone just submitted an enquiry through your website. Reply to them as soon as you can — fast responses win jobs.</Text>
            </Column>
          </Row>
        </Section>

        <Section style={panel}>
          <Row>
            <Column style={panelInner}>
              <Text style={panelTitle}>Lead details</Text>
              <DetailRow label="Name" value={leadName} />
              <DetailRow label="Email" value={leadEmail} />
              <DetailRow label="Phone" value={leadPhone} />
              <DetailRow label="Message" value={leadMessage} />
              <DetailRow label="Received" value={receivedAt} />
            </Column>
          </Row>
        </Section>

        <Text style={footer}>This notification was sent automatically by Pixcellor on behalf of {customerWebsiteName || 'your website'}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CustomerLeadEmail,
  subject: (data: Record<string, any>) => `New lead${data.leadName ? ` from ${data.leadName}` : ''}`,
  displayName: 'Customer lead notification',
  previewData: {
    customerWebsiteName: 'DMB Scaffolding',
    leadName: 'Jane Smith',
    leadEmail: 'jane@example.com',
    leadPhone: '07123 456789',
    leadMessage: 'Looking for a quote on scaffolding for a 2-storey extension.',
    receivedAt: new Date().toLocaleString('en-GB'),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '44px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', maxWidth: '620px' }
const hero = { borderBottom: '1px solid #202020' }
const heroInner = { padding: '34px 34px 26px' }
const brand = { color: '#ffffff', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 30px' }
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
const detailValue = { color: '#f5f5f5', fontSize: '14px', fontWeight: '600' as const, lineHeight: '1.5', margin: '12px 0', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const, whiteSpace: 'pre-wrap' as const }
const footer = { borderTop: '1px solid #242424', color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '22px 34px 0', padding: '18px 0 30px' }
