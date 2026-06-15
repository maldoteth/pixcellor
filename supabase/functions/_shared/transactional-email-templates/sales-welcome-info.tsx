import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor'
const SITE_URL = 'https://pixcellor.com'

type SalesWelcomeProps = {
  name?: string
  email?: string
}

const SalesWelcomeEmail = ({ name }: SalesWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light" />
    </Head>
    <Preview>Thanks for reaching out to Pixcellor — here's what happens next.</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={section}>
          <Heading style={h1}>{name ? `Hi ${name},` : 'Hi,'}</Heading>
          <Text style={text}>
            Thanks for getting in touch with {BRAND_NAME}. I've received your message
            and will reply personally within one working day to talk through your project.
          </Text>
          <Text style={text}>
            In the meantime, if you'd like to see our packages and process, you can
            view them here:
          </Text>
          <Button style={button} href={SITE_URL}>View packages</Button>
          <Text style={text}>
            Reply directly to this email if there's anything you'd like to add — it
            comes straight to me.
          </Text>
          <Text style={signoff}>
            — Alex<br />
            Customer Support Director, {BRAND_NAME}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SalesWelcomeEmail,
  subject: 'Thanks for reaching out to Pixcellor',
  displayName: 'Sales welcome (auto-reply)',
  previewData: { name: 'Jamie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '32px 14px' }
const shell = { backgroundColor: '#ffffff', maxWidth: '560px', margin: '0 auto' }
const section = { padding: '8px 4px' }
const h1 = { color: '#111111', fontSize: '20px', fontWeight: '600' as const, lineHeight: '1.3', margin: '0 0 16px' }
const text = { color: '#333333', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px' }
const signoff = { color: '#333333', fontSize: '15px', lineHeight: '1.6', margin: '24px 0 0' }
const button = { backgroundColor: '#000000', borderRadius: '6px', border: '2px solid #000000', color: '#ffffff', display: 'inline-block', fontSize: '15px', fontWeight: '700' as const, margin: '4px 0 20px', padding: '14px 26px', textDecoration: 'none' }
