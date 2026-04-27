import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'

interface OrderEmailProps {
  customerEmail?: string
  orderId?: string
  packageName?: string
  amount?: string
  billing?: string
}

const RetainerOrderConfirmationEmail = ({ customerEmail, orderId, packageName, amount, billing }: OrderEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Pixcellor Retainer is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{BRAND_NAME}</Text>
        <Heading style={h1}>Your Retainer is confirmed</Heading>
        <Text style={text}>
          Thanks for choosing Pixcellor. Your order is confirmed and we’ll use the details below to begin preparing your project workflow.
        </Text>
        <div style={panel}>
          <Text style={item}><span style={strong}>Package:</span> {packageName || 'Retainer'}</Text>
          {billing && <Text style={item}><span style={strong}>Billing:</span> {billing}</Text>}
          {amount && <Text style={item}><span style={strong}>Amount:</span> {amount}</Text>}
          {orderId && <Text style={item}><span style={strong}>Order ID:</span> {orderId}</Text>}
          {customerEmail && <Text style={item}><span style={strong}>Email:</span> {customerEmail}</Text>}
        </div>
        <Text style={text}>
          Next: reply with any specifics, requests, preferred colours, brand assets or images, social links, copy, examples you like, and anything else that will help us perfect your site.
        </Text>
        <Text style={text}>We’ll treat this as your ongoing tech department and align on priorities, response cadence, and the first sprint of work.</Text>
        <Text style={footer}>
          If anything looks wrong, reply to projects@pixcellor.com and we’ll update it before we move forward. — Pixcellor
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RetainerOrderConfirmationEmail,
  subject: (data: Record<string, any>) => `Your Pixcellor ${data.packageName || 'Retainer'} order is confirmed`,
  displayName: 'Retainer order confirmation',
  previewData: {
    customerEmail: 'client@example.com',
    orderId: 'cs_test_123',
    packageName: 'Retainer',
    amount: '£1,200.00',
    billing: 'Subscription',
  },
} satisfies TemplateEntry


const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  padding: '32px 12px',
}
const container = {
  backgroundColor: '#080808',
  border: '1px solid #2e2e2e',
  borderRadius: '12px',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.18)',
  maxWidth: '600px',
  padding: '34px 30px',
}
const brand = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '700' as const,
  letterSpacing: '0',
  margin: '0 0 28px',
}
const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700' as const,
  letterSpacing: '0',
  lineHeight: '1.2',
  margin: '0 0 18px',
}
const text = {
  color: '#d4d4d4',
  fontSize: '15px',
  lineHeight: '1.65',
  margin: '0 0 18px',
}
const panel = {
  backgroundColor: '#111111',
  border: '1px solid #262626',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '10px 0 22px',
}
const item = {
  color: '#d4d4d4',
  fontSize: '14px',
  lineHeight: '1.55',
  margin: '0 0 8px',
}
const strong = { color: '#ffffff', fontWeight: '700' as const }
const footer = {
  borderTop: '1px solid #242424',
  color: '#8f8f8f',
  fontSize: '12px',
  lineHeight: '1.55',
  margin: '30px 0 0',
  paddingTop: '18px',
}
