/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const BRAND_NAME = 'Pixcellor™'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Pixcellor verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{BRAND_NAME}</Text>
        <Heading style={h1}>Confirm it is you</Heading>
        <Text style={text}>Use this code to confirm your identity in the Pixcellor portal:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you did not request it, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  padding: '32px 12px',
}
const container = {
  backgroundColor: '#080808',
  border: '1px solid #2e2e2e',
  borderRadius: '12px',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.18)',
  maxWidth: '560px',
  padding: '34px 30px',
}
const brand = {
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '700' as const,
  letterSpacing: '0',
  margin: '0 0 28px',
}
const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700' as const,
  letterSpacing: '0',
  lineHeight: '1.2',
  margin: '0 0 18px',
}
const text = {
  color: '#d4d4d4',
  fontSize: '15px',
  lineHeight: '1.65',
  margin: '0 0 20px',
}
const codeStyle = {
  backgroundColor: '#111111',
  border: '1px solid #262626',
  borderRadius: '10px',
  color: '#ffffff',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '28px',
  fontWeight: '700' as const,
  letterSpacing: '4px',
  margin: '8px 0 24px',
  padding: '16px 18px',
  textAlign: 'center' as const,
}
const footer = {
  borderTop: '1px solid #242424',
  color: '#8f8f8f',
  fontSize: '12px',
  lineHeight: '1.55',
  margin: '30px 0 0',
  paddingTop: '18px',
}
