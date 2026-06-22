import * as React from 'npm:react@18.3.1'
import { Body, Column, Container, Head, Heading, Html, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'

interface InternalOrderNotificationProps {
  customerEmail?: string
  orderId?: string
  packageName?: string
  amount?: string
  billing?: string
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

const InternalNewOrderNotificationEmail = ({ customerEmail, orderId, packageName, amount, billing }: InternalOrderNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Pixcellor order received</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row>
            <Column style={heroInner}>
              <Text style={brand}>{BRAND_NAME}</Text>
              <Text style={eyebrow}>DEV PORTAL ALERT</Text>
              <Heading style={h1}>New order received</Heading>
              <Text style={intro}>A new Pixcellor order has been paid, logged in the Dev Portal, and the client confirmation email has been queued.</Text>
            </Column>
          </Row>
        </Section>

        <Section style={panel}>
          <Row>
            <Column style={panelInner}>
              <Text style={panelTitle}>Order snapshot</Text>
              <DetailRow label="Package" value={packageName || 'Pixcellor package'} />
              <DetailRow label="Billing" value={billing} />
              <DetailRow label="Amount" value={amount} />
              <DetailRow label="Customer" value={customerEmail} />
              <DetailRow label="Order ID" value={orderId} />
            </Column>
          </Row>
        </Section>

        <Text style={footer}>Check the Dev Portal for the order, then watch the inbox for the client’s reply with colours, images, links, copy, requests, and project specifics.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InternalNewOrderNotificationEmail,
  subject: (data: Record<string, any>) => `New Pixcellor order: ${data.packageName || 'Website package'}`,
  displayName: 'Internal new order notification',
  previewData: {
    customerEmail: 'client@example.com',
    orderId: 'cs_test_123',
    packageName: 'Full Works',
    amount: '£169.00',
    billing: 'One-time payment',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  padding: '44px 14px',
}
const shell = {
  backgroundColor: '#070707',
  border: '1px solid #262626',
  maxWidth: '620px',
}
const hero = {
  borderBottom: '1px solid #202020',
}
const heroInner = {
  padding: '34px 34px 26px',
}
const brand = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '800' as const,
  letterSpacing: '0',
  margin: '0 0 30px',
}
const eyebrow = {
  color: '#a3a3a3',
  fontSize: '11px',
  fontWeight: '800' as const,
  letterSpacing: '0.08em',
  lineHeight: '1.4',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}
const h1 = {
  color: '#ffffff',
  fontSize: '30px',
  fontWeight: '800' as const,
  letterSpacing: '0',
  lineHeight: '1.15',
  margin: '0 0 16px',
}
const intro = {
  color: '#d7d7d7',
  fontSize: '16px',
  lineHeight: '1.65',
  margin: '0',
}
const panel = {}
const panelInner = {
  padding: '28px 34px 12px',
}
const panelTitle = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '800' as const,
  lineHeight: '1.4',
  margin: '0 0 14px',
}
const detailRow = { borderTop: '1px solid #242424' }
const labelColumn = { width: '124px', verticalAlign: 'top' as const }
const valueColumn = { verticalAlign: 'top' as const }
const detailLabel = {
  color: '#969696',
  fontSize: '12px',
  fontWeight: '700' as const,
  lineHeight: '1.5',
  margin: '12px 0',
  textTransform: 'uppercase' as const,
}
const detailValue = {
  color: '#f5f5f5',
  fontSize: '14px',
  fontWeight: '600' as const,
  lineHeight: '1.5',
  margin: '12px 0',
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
}
const footer = {
  borderTop: '1px solid #242424',
  color: '#929292',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '22px 34px 0',
  padding: '18px 0 30px',
}
