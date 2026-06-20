import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor'

type Props = {
  code?: string
  purposeLabel?: string
  expiresMinutes?: number
}

const Email = ({ code = '000000', purposeLabel = 'a wallet action', expiresMinutes = 5 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light" />
    </Head>
    <Preview>Your {BRAND_NAME} wallet code is {code}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={section}>
          <Heading style={h1}>Confirm {purposeLabel}</Heading>
          <Text style={text}>
            Use the code below to authorise {purposeLabel} on your {BRAND_NAME} wallet. It expires in {expiresMinutes} minutes.
          </Text>
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={warn}>
            If you didn't request this, someone may have your wallet password. Change it immediately and do not share this code with anyone — {BRAND_NAME} staff will never ask for it.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Pixcellor wallet confirmation code',
  displayName: 'Wallet transaction OTP',
  previewData: { code: '482913', purposeLabel: 'a transfer', expiresMinutes: 5 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }
const shell = { maxWidth: '480px', margin: '0 auto', padding: '24px' }
const section = { padding: '8px 0' }
const h1 = { color: '#0a0a0a', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }
const text = { color: '#3f3f46', fontSize: '15px', lineHeight: '22px', margin: '0 0 16px' }
const codeBox = {
  backgroundColor: '#0a0a0a',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '16px 0',
}
const codeText = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '8px',
  margin: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}
const warn = { color: '#71717a', fontSize: '12px', lineHeight: '18px', margin: '12px 0 0' }
