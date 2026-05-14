import * as React from 'npm:react@18.3.1'
import { Body, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

type SalesFollowupProps = {
  clientName?: string
  signName?: string
  signRole?: string
}

const SalesFollowupEmail = ({ clientName, signName, signRole }: SalesFollowupProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Following up on our call — try Pixcellor for free</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row>
            <Column style={heroInner}>
              <Row style={brandRow}>
                <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
                <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
              </Row>
              <Text style={eyebrow}>FOLLOWING UP</Text>
              <Heading style={h1}>{clientName ? `Hi ${clientName},` : 'Hi there,'}</Heading>
            </Column>
          </Row>
        </Section>

        <Section style={panel}>
          <Row>
            <Column style={panelInner}>
              <Text style={text}>
                I was reaching out today as I imagine upgrading the website will be on the agenda sooner or later and wanted to offer our free sample and trial services.
              </Text>
              <Text style={text}>
                Please do let me know who the best person is to speak to in this regard whenever you get a chance.
              </Text>
              <Text style={text}>
                Our try before you buy services exist as we're so confident teams will love us!
              </Text>
              <Text style={signoff}>Best regards,</Text>
              <Text style={signNameStyle}>{signName || 'Alex Reyes'}</Text>
              <Text style={signRoleStyle}>{signRole || 'Sales Director'}</Text>
              <Text style={signRoleStyle}>Pixcellor.com</Text>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SalesFollowupEmail,
  subject: 'Following up — try Pixcellor for free',
  displayName: 'Sales call follow up',
  fromAddress: 'alex@pixcellor.com',
  fromName: 'Alex Reyes',
  previewData: { clientName: 'Jane' },
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
const h1 = { color: '#ffffff', fontSize: '28px', fontWeight: '800' as const, lineHeight: '1.15', margin: '0' }
const panel = {}
const panelInner = { padding: '28px 34px 28px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '14px 0 0' }
const signoff = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '24px 0 0' }
const signNameStyle = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, margin: '2px 0 0' }
const signRoleStyle = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '2px 0 0' }
