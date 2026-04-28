import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'

type CompletionEmailProps = {
  customerEmail?: string
  orderId?: string
  packageName?: string
  deliveredDomain?: string
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

const FullWorksOrderCompleteEmail = ({ customerEmail, orderId, packageName, deliveredDomain }: CompletionEmailProps) => {
  const cleanDomain = deliveredDomain || 'your new website domain'
  const websiteUrl = deliveredDomain ? `https://${deliveredDomain.replace(/^https?:\/\//i, '')}` : undefined
  const packageLabel = packageName || 'Full Works'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Pixcellor Full Works website is complete</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={hero}>
            <Text style={brand}>{BRAND_NAME}</Text>
            <Text style={eyebrow}>ORDER COMPLETE</Text>
            <Heading style={h1}>Your order is complete!</Heading>
            <Text style={intro}>Your {packageLabel} project has been completed and is ready to view on its live domain.</Text>
          </Section>

          <Section style={domainPanel}>
            <Text style={domainLabel}>Domain</Text>
            <Text style={domainValue}>{cleanDomain}</Text>
            {websiteUrl && <Button style={button} href={websiteUrl}>View website</Button>}
          </Section>

          <Section style={panel}>
            <Text style={panelTitle}>Completion details</Text>
            <DetailRow label="Package" value={packageLabel} />
            <DetailRow label="Order ID" value={orderId} />
            <DetailRow label="Email" value={customerEmail} />
          </Section>

          <Text style={footer}>If you need anything adjusted, reply to projects@pixcellor.com and we’ll help from there.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FullWorksOrderCompleteEmail,
  subject: (data: Record<string, any>) => `Your Pixcellor ${data.packageName || 'Full Works'} order is complete`,
  displayName: 'Full Works order complete',
  previewData: { customerEmail: 'client@example.com', orderId: 'cs_test_123', packageName: 'Full Works', deliveredDomain: 'example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '44px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', borderRadius: '14px', boxShadow: '0 26px 90px rgba(0, 0, 0, 0.22)', maxWidth: '620px', overflow: 'hidden' }
const hero = { padding: '34px 34px 24px', borderBottom: '1px solid #202020' }
const brand = { color: '#ffffff', fontSize: '14px', fontWeight: '800' as const, letterSpacing: '0', margin: '0 0 30px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', lineHeight: '1.4', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#ffffff', fontSize: '30px', fontWeight: '800' as const, letterSpacing: '0', lineHeight: '1.15', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0' }
const domainPanel = { backgroundColor: '#ffffff', borderRadius: '12px', margin: '26px 34px 18px', padding: '22px' }
const domainLabel = { color: '#525252', fontSize: '12px', fontWeight: '800' as const, letterSpacing: '0.08em', margin: '0 0 8px', textTransform: 'uppercase' as const }
const domainValue = { color: '#050505', fontSize: '24px', fontWeight: '900' as const, lineHeight: '1.25', margin: '0 0 16px', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const }
const button = { backgroundColor: '#050505', borderRadius: '10px', color: '#ffffff', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, padding: '13px 18px', textDecoration: 'none' }
const panel = { backgroundColor: '#101010', border: '1px solid #2a2a2a', borderRadius: '12px', margin: '0 34px 24px', padding: '20px 22px 12px' }
const panelTitle = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 14px' }
const detailRow = { borderTop: '1px solid #242424' }
const labelColumn = { width: '124px', verticalAlign: 'top' as const }
const valueColumn = { verticalAlign: 'top' as const }
const detailLabel = { color: '#969696', fontSize: '12px', fontWeight: '700' as const, lineHeight: '1.5', margin: '12px 0', textTransform: 'uppercase' as const }
const detailValue = { color: '#f5f5f5', fontSize: '14px', fontWeight: '600' as const, lineHeight: '1.5', margin: '12px 0', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const }
const footer = { borderTop: '1px solid #242424', color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '22px 34px 0', padding: '18px 0 30px' }