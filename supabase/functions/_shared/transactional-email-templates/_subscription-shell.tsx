// Shared style tokens + small components for subscription emails.
// Matches the dark Pixcellor shell used by order confirmation emails.
import * as React from 'npm:react@18.3.1'
import { Body, Column, Container, Head, Heading, Html, Img, Link, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'

export const BRAND_NAME = 'Pixcellor™'
export const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  padding: '44px 14px',
}
export const shell = {
  backgroundColor: '#070707',
  border: '1px solid #262626',
  maxWidth: '620px',
}
export const hero = { borderBottom: '1px solid #202020' }
export const heroInner = { padding: '34px 34px 26px' }
export const brandRow = { margin: '0 0 28px' }
export const brand = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '800' as const,
  margin: '0',
}
export const markColumn = {
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
  width: '46px',
}
export const mark = { display: 'block', margin: '0', width: '40px', height: '40px' }
export const eyebrow = {
  color: '#a3a3a3',
  fontSize: '11px',
  fontWeight: '800' as const,
  letterSpacing: '0.08em',
  lineHeight: '1.4',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}
export const h1 = {
  color: '#ffffff',
  fontSize: '30px',
  fontWeight: '800' as const,
  lineHeight: '1.15',
  margin: '0 0 16px',
}
export const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0' }
export const panelInner = { padding: '28px 34px 12px' }
export const panelTitle = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '800' as const,
  lineHeight: '1.4',
  margin: '0 0 14px',
}
export const detailRow = { borderTop: '1px solid #242424' }
export const labelColumn = { width: '140px', verticalAlign: 'top' as const }
export const valueColumn = { verticalAlign: 'top' as const }
export const detailLabel = {
  color: '#969696',
  fontSize: '12px',
  fontWeight: '700' as const,
  lineHeight: '1.5',
  margin: '12px 0',
  textTransform: 'uppercase' as const,
}
export const detailValue = {
  color: '#f5f5f5',
  fontSize: '14px',
  fontWeight: '600' as const,
  lineHeight: '1.5',
  margin: '12px 0',
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
}
export const nextInner = { padding: '0 34px 2px' }
export const sectionKicker = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '800' as const,
  lineHeight: '1.4',
  margin: '0 0 10px',
}
export const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '0 0 16px' }
export const featureItem = {
  color: '#e5e5e5',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 8px',
  paddingLeft: '18px',
  position: 'relative' as const,
}
export const button = {
  backgroundColor: '#ffffff',
  borderRadius: '0',
  color: '#050505',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '800' as const,
  margin: '2px 0 14px',
  padding: '13px 18px',
  textDecoration: 'none',
}
export const buttonSecondary = {
  ...button,
  backgroundColor: 'transparent',
  border: '1px solid #ffffff',
  color: '#ffffff',
  marginLeft: '10px',
}
export const alertBox = {
  backgroundColor: '#2a0d0d',
  border: '1px solid #5a1a1a',
  color: '#ffdada',
  padding: '14px 18px',
  margin: '0 0 16px',
  fontSize: '14px',
  lineHeight: '1.5',
}
export const inlineLink = { color: '#ffffff', fontWeight: '700' as const, textDecoration: 'underline' }

export const renderDetailValue = (value: string) => {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return <Link href={`mailto:${value}`} style={inlineLink}>{value}</Link>
  }
  if (/^https?:\/\//.test(value)) {
    return <Link href={value} style={inlineLink}>{value}</Link>
  }
  return value
}

export const DetailRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null
  return (
    <Row style={detailRow}>
      <Column style={labelColumn}><Text style={detailLabel}>{label}</Text></Column>
      <Column style={valueColumn}><Text style={detailValue}>{renderDetailValue(value)}</Text></Column>
    </Row>
  )
}

export const Header = ({ eyebrowText, title, introText }: { eyebrowText: string; title: string; introText: string }) => (
  <Section style={hero}>
    <Row>
      <Column style={heroInner}>
        <Row style={brandRow}>
          <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
          <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
        </Row>
        <Text style={eyebrow}>{eyebrowText}</Text>
        <Heading style={h1}>{title}</Heading>
        <Text style={intro}>{introText}</Text>
      </Column>
    </Row>
  </Section>
)

export { Body, Container, Html, Head, Preview, Section, Row, Column, Text, Heading }
