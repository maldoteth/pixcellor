import * as React from 'npm:react@18.3.1'
import { Body, Column, Container, Head, Heading, Html, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'

type OrderEmailProps = {
  customerEmail?: string
  orderId?: string
  packageName?: string
  amount?: string
  billing?: string
}

type OrderTemplateConfig = {
  fallbackPackage: string
  title: string
  preview: string
  nextBody: string
  subjectFallback: string
  displayName: string
  previewData: OrderEmailProps
}

const DetailRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null

  return (
    <Row style={detailRow}>
      <Column style={labelColumn}>
        <Text style={detailLabel}>{label}</Text>
      </Column>
      <Column style={valueColumn}>
        <Text style={detailValue}>{value}</Text>
      </Column>
    </Row>
  )
}

const createOrderEmail = (config: OrderTemplateConfig) => {
  const OrderEmail = ({ customerEmail, orderId, packageName, amount, billing }: OrderEmailProps) => (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{config.preview}</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={hero}>
            <Text style={brand}>{BRAND_NAME}</Text>
            <Text style={eyebrow}>ORDER CONFIRMED</Text>
            <Heading style={h1}>{config.title}</Heading>
            <Text style={intro}>
              Thanks for choosing Pixcellor. Your payment is confirmed and your project has been added to our build workflow.
            </Text>
          </Section>

          <Section style={panel}>
            <Text style={panelTitle}>Order details</Text>
            <DetailRow label="Package" value={packageName || config.fallbackPackage} />
            <DetailRow label="Billing" value={billing} />
            <DetailRow label="Amount" value={amount} />
            <DetailRow label="Order ID" value={orderId} />
            <DetailRow label="Email" value={customerEmail} />
          </Section>

          <Section style={nextPanel}>
            <Text style={sectionKicker}>What happens next</Text>
            <Text style={text}>{config.nextBody}</Text>
            <Text style={text}>
              Reply with your preferred colours, brand assets, images, social links, copy, examples you like, and any requests we should know before we begin.
            </Text>
          </Section>

          <Text style={footer}>
            If anything looks wrong, reply to projects@pixcellor.com and we’ll update it before we move forward.
          </Text>
        </Container>
      </Body>
    </Html>
  )

  return {
    component: OrderEmail,
    subject: (data: Record<string, any>) => `Your Pixcellor ${data.packageName || config.subjectFallback} order is confirmed`,
    displayName: config.displayName,
    previewData: config.previewData,
  } satisfies TemplateEntry
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  padding: '44px 14px',
}
const shell = {
  backgroundColor: '#070707',
  border: '1px solid #262626',
  borderRadius: '14px',
  boxShadow: '0 26px 90px rgba(0, 0, 0, 0.22)',
  maxWidth: '620px',
  overflow: 'hidden',
}
const hero = {
  padding: '34px 34px 26px',
  borderBottom: '1px solid #202020',
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
const panel = {
  backgroundColor: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: '12px',
  margin: '26px 34px 24px',
  padding: '20px 22px 12px',
}
const panelTitle = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '800' as const,
  lineHeight: '1.4',
  margin: '0 0 14px',
}
const detailRow = {
  borderTop: '1px solid #242424',
}
const labelColumn = {
  width: '124px',
  verticalAlign: 'top' as const,
}
const valueColumn = {
  verticalAlign: 'top' as const,
}
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
const nextPanel = {
  padding: '0 34px 2px',
}
const sectionKicker = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '800' as const,
  lineHeight: '1.4',
  margin: '0 0 10px',
}
const text = {
  color: '#d0d0d0',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 16px',
}
const footer = {
  borderTop: '1px solid #242424',
  color: '#929292',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '22px 34px 0',
  padding: '18px 0 30px',
}

export const template = createOrderEmail({
  fallbackPackage: 'Retainer',
  title: 'Your Retainer is confirmed',
  preview: 'Your Pixcellor Retainer is confirmed',
  nextBody: 'We’ll treat this as your ongoing tech department and align on priorities, response cadence, and the first sprint of work.',
  subjectFallback: 'Retainer',
  displayName: 'Retainer order confirmation',
  previewData: {
    customerEmail: 'client@example.com',
    orderId: 'cs_test_123',
    packageName: 'Retainer',
    amount: '£1,200.00',
    billing: 'Subscription',
  },
})
