import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png?v=2'

type VisionPreviewReadyProps = {
  clientName?: string
  title?: string
  brief?: string
  previewUrl?: string
  imageUrl?: string
}

const VisionPreviewReadyEmail = ({ clientName, title, brief, previewUrl, imageUrl }: VisionPreviewReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Pixcellor preview is ready</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row>
            <Column style={heroInner}>
              <Row style={brandRow}>
                <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
                <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
              </Row>
              <Text style={eyebrow}>YOUR PREVIEW IS READY</Text>
              <Heading style={h1}>{clientName ? `${clientName}, take a look` : 'Take a look at your preview'}</Heading>
              <Text style={intro}>
                We've crafted an early visual concept{title ? ` for ${title}` : ''}. Open the link below to see the full design and let us know what you think.
              </Text>
            </Column>
          </Row>
        </Section>

        {imageUrl && (
          <Section>
            <Row>
              <Column style={imageWrap}>
                <Img src={imageUrl} alt={title ?? 'Vision preview'} width="552" style={image} />
              </Column>
            </Row>
          </Section>
        )}

        <Section style={panel}>
          <Row>
            <Column style={panelInner}>
              {previewUrl && <Button style={button} href={previewUrl}>Open your preview</Button>}
              {brief && <Text style={meta}>Brief: {brief}</Text>}
              <Text style={text}>
                Reply to this email with any tweaks — colours, copy, layout — and we'll iterate until it's exactly right.
              </Text>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VisionPreviewReadyEmail,
  subject: (data: Record<string, any>) => data?.title ? `Your Pixcellor preview: ${data.title}` : 'Your Pixcellor preview is ready',
  displayName: 'Vision preview ready',
  previewData: {
    clientName: 'Jane',
    title: 'Acme Florist',
    brief: 'Modern florist site, soft pastels, hero with arrangements grid.',
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
const h1 = { color: '#ffffff', fontSize: '30px', fontWeight: '800' as const, lineHeight: '1.15', margin: '0 0 16px' }
const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0' }
const imageWrap = { padding: '0', backgroundColor: '#000000' }
const image = { display: 'block', width: '100%', height: 'auto', margin: '0' }
const panel = {}
const panelInner = { padding: '28px 34px 24px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '14px 0 0' }
const button = { backgroundColor: '#ffffff', borderRadius: '0', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '0 0 14px', padding: '13px 18px', textDecoration: 'none' }
const meta = { color: '#929292', fontSize: '12px', lineHeight: '1.6', margin: '8px 0 0' }
