import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://pixcellor.com/pixcellor-email-logo.png'

type OrderCompleteProps = {
  customerEmail?: string
  orderId?: string
  packageName?: string
  deliveredDomain?: string
  deliveredUrl?: string
}

const OrderCompleteEmail = ({ customerEmail, orderId, packageName, deliveredDomain, deliveredUrl }: OrderCompleteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Pixcellor website is complete</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row style={brandRow}>
            <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
            <Column style={logoColumn}><Img src={LOGO_URL} width="42" height="42" alt="Pixcellor logo" style={logo} /></Column>
          </Row>
          <Text style={eyebrow}>WEBSITE COMPLETE</Text>
          <Heading style={h1}>Your website is ready</Heading>
          <Text style={intro}>Your {packageName || 'Pixcellor'} build has been completed and delivered.</Text>
        </Section>

        <Section style={panel}>
          <Text style={panelTitle}>Delivery details</Text>
          {deliveredDomain && <Text style={text}>Your website is live at {deliveredDomain}.</Text>}
          {deliveredUrl && <Button style={button} href={deliveredUrl}>View website</Button>}
          {orderId && <Text style={meta}>Order ID: {orderId}</Text>}
          {customerEmail && <Text style={meta}>Sent to: {customerEmail}</Text>}
        </Section>

      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderCompleteEmail,
  subject: 'Your Pixcellor website is complete',
  displayName: 'Order complete',
  previewData: {
    customerEmail: 'client@example.com',
    orderId: 'PXC-ABCD-1234',
    packageName: 'Full Works',
    deliveredDomain: 'example.com',
    deliveredUrl: 'https://example.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '44px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', borderRadius: '14px', boxShadow: '0 26px 90px rgba(0, 0, 0, 0.22)', maxWidth: '620px', overflow: 'hidden' }
const hero = { padding: '34px 34px 26px', borderBottom: '1px solid #202020' }
const brandRow = { margin: '0 0 28px' }
const brand = { color: '#ffffff', fontSize: '14px', fontWeight: '800' as const, letterSpacing: '0', margin: '0' }
const logoColumn = { textAlign: 'right' as const, verticalAlign: 'top' as const, width: '52px' }
const logo = { display: 'inline-block', border: '1px solid #242424', borderRadius: '8px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', lineHeight: '1.4', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#ffffff', fontSize: '30px', fontWeight: '800' as const, letterSpacing: '0', lineHeight: '1.15', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0' }
const panel = { backgroundColor: '#101010', border: '1px solid #2a2a2a', borderRadius: '12px', margin: '26px 34px 24px', padding: '22px 22px 12px' }
const panelTitle = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 12px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '0 0 16px' }
const button = { backgroundColor: '#ffffff', borderRadius: '10px', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 14px', padding: '13px 18px', textDecoration: 'none' }
const meta = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '8px 0' }