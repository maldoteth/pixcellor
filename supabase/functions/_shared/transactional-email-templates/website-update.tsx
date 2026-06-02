import * as React from 'npm:react@18.3.1'
import { Body, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

type WebsiteUpdateProps = {
  customerName?: string
  message?: string
}

const WebsiteUpdateEmail = ({ customerName, message }: WebsiteUpdateProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your website has been updated</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row>
            <Column style={heroInner}>
              <Row style={brandRow}>
                <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
                <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
              </Row>
              <Text style={eyebrow}>WEBSITE UPDATE</Text>
              <Heading style={h1}>Your website has been updated</Heading>
              <Text style={intro}>
                {customerName ? `Hi ${customerName}, ` : 'Hi, '}
                {message || 'the changes you requested are now live on your website. Take a look when you get a moment and let us know if anything else needs tweaking.'}
              </Text>
            </Column>
          </Row>
        </Section>

        <Section style={panel}>
          <Row>
            <Column style={panelInner}>
              <Text style={signOff}>Best,</Text>
              <Text style={signName}>Erica Hernandez</Text>
              <Text style={signRole}>Client Director</Text>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WebsiteUpdateEmail,
  subject: 'Your website has been updated',
  displayName: 'Website update',
  previewData: {
    customerName: 'Jamie',
    message: 'the changes you requested are now live on your website. Take a look when you get a moment and let us know if anything else needs tweaking.',
  },
  fromAddress: 'erica@pixcellor.com',
  fromName: 'Erica Hernandez',
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '44px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', maxWidth: '620px' }
const hero = { borderBottom: '1px solid #202020' }
const heroInner = { padding: '34px 34px 26px' }
const brandRow = { margin: '0 0 28px' }
const brand = { color: '#ffffff', fontSize: '14px', fontWeight: '800' as const, letterSpacing: '0', margin: '0' }
const markColumn = { textAlign: 'right' as const, verticalAlign: 'top' as const, width: '46px' }
const mark = { display: 'block', margin: '0', width: '40px', height: '40px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', lineHeight: '1.4', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#ffffff', fontSize: '30px', fontWeight: '800' as const, letterSpacing: '0', lineHeight: '1.15', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0' }
const panel = {}
const panelInner = { padding: '28px 34px 32px' }
const signOff = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.6', margin: '0 0 14px' }
const signName = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0' }
const signRole = { color: '#929292', fontSize: '13px', lineHeight: '1.5', margin: '2px 0 0' }
