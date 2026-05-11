import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

type RequirementsReminderProps = {
  customerEmail?: string
  orderId?: string
  packageName?: string
  requirementsUrl?: string
}

const ProjectRequirementsReminderEmail = ({ customerEmail, orderId, packageName, requirementsUrl }: RequirementsReminderProps) => {
  const briefUrl = requirementsUrl || 'https://pixcellor.com/project-requirements'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Send your project requirements to Pixcellor</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={hero}>
            <Row>
              <Column style={heroInner}>
                <Row style={brandRow}>
                  <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
                  <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
                </Row>
                <Text style={eyebrow}>PROJECT REQUIREMENTS</Text>
                <Heading style={h1}>We still need your project details</Heading>
                <Text style={intro}>
                  Your {packageName || 'Pixcellor'} order is confirmed. To start the build properly, please send the site details, page requirements, visual direction, references, content, images, and socials.
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={panel}>
            <Row>
              <Column style={panelInner}>
                <Text style={panelTitle}>Submit your requirements</Text>
                <Text style={text}>
                  The form links directly to your order{customerEmail ? ` for ${customerEmail}` : ''}, so everything lands in the project portal without you needing to email it manually.
                </Text>
                <Button style={button} href={briefUrl}>Add project requirements</Button>
              </Column>
            </Row>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProjectRequirementsReminderEmail,
  subject: 'Reminder: add your Pixcellor project requirements',
  displayName: 'Project requirements reminder',
  previewData: {
    requirementsUrl: 'https://pixcellor.com/project-requirements?order=PXC-ABCD-1234&token=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    customerEmail: 'client@example.com',
    orderId: 'PXC-ABCD-1234',
    packageName: 'Full Works',
  },
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
const panelInner = { padding: '28px 34px 4px' }
const panelTitle = { color: '#ffffff', fontSize: '16px', fontWeight: '800' as const, lineHeight: '1.4', margin: '0 0 10px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '0 0 18px' }
const button = { backgroundColor: '#ffffff', borderRadius: '0', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 18px', padding: '13px 18px', textDecoration: 'none' }