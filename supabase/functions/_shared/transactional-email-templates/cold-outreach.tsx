import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

type ColdOutreachProps = {
  clientName?: string
  companyName?: string
  previewUrl?: string
  imageUrl?: string
  signName?: string
  signRole?: string
}

const ColdOutreachEmail = ({ clientName, companyName, previewUrl, imageUrl, signName, signRole }: ColdOutreachProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`A website concept for ${companyName || 'your business'}`}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row>
            <Column style={heroInner}>
              <Row style={brandRow}>
                <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
                <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
              </Row>
              <Text style={eyebrow}>A QUICK NOTE</Text>
              <Heading style={h1}>{clientName ? `Hi ${clientName},` : 'Hi there,'}</Heading>
              <Text style={intro}>
                Here's a custom site branding design I put together for {companyName || 'your business'} — it's all yours to keep, no strings attached.
              </Text>
            </Column>
          </Row>
        </Section>

        {imageUrl && (
          <Section>
            <Row>
              <Column style={imageWrap}>
                <Img src={imageUrl} alt={companyName ?? 'Website concept'} width="552" style={image} />
              </Column>
            </Row>
          </Section>
        )}

        <Section style={panel}>
          <Row>
            <Column style={panelInner}>
              {previewUrl && <Button style={button} href={previewUrl}>View your preview</Button>}
              <Text style={text}>
                If you'd like us to build it out, just reply to this email and we'll take it from there. We operate on a try-before-you-buy basis so you can see the finished product before committing.
              </Text>
              <Text style={text}>
                Our service is fully inclusive — domains, hosting, copy, imagery and ongoing edits are all handled by our team. You don't have to do a thing. Every site we ship is also covered by our <strong style={strong}>lifetime warranty</strong>, so it stays looking sharp and running smoothly for as long as you're with us.
              </Text>
              <Text style={signoff}>Warm regards,</Text>
              <Text style={signName_}>{signName || 'Alex Reyes'}</Text>
              <Text style={signRole_}>{signRole || 'Sales Director'}</Text>
              <Text style={signRole_}>Pixcellor.com</Text>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ColdOutreachEmail,
  subject: (data: Record<string, any>) => `A website concept for ${data?.companyName || 'your business'}`,
  displayName: 'Cold outreach',
  previewData: {
    clientName: 'Jane',
    companyName: 'Acme Florist',
    previewUrl: 'https://pixcellor.com/preview/abc123',
    imageUrl: 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2',
  },
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
const h1 = { color: '#ffffff', fontSize: '28px', fontWeight: '800' as const, lineHeight: '1.15', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0' }
const imageWrap = { padding: '0', backgroundColor: '#000000' }
const image = { display: 'block', width: '100%', height: 'auto', margin: '0' }
const panel = {}
const panelInner = { padding: '28px 34px 28px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '14px 0 0' }
const strong = { color: '#ffffff', fontWeight: '800' as const }
const button = { backgroundColor: '#ffffff', borderRadius: '0', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 6px', padding: '13px 18px', textDecoration: 'none' }
const signoff = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '24px 0 0' }
const signName_ = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, margin: '2px 0 0' }
const signRole_ = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '2px 0 0' }
