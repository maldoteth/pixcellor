/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const BRAND_NAME = 'Pixcellor™'

export const EmailChangeEmail = ({
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your Pixcellor email change</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{BRAND_NAME}</Text>
        <Heading style={h1}>Confirm email change</Heading>
        <Text style={text}>
          Confirm that your Pixcellor portal email should change from <Link href={`mailto:${email}`} style={link}>{email}</Link> to <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm change
        </Button>
        <Text style={footer}>
          If you did not request this change, secure your account and contact Pixcellor support.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const mutedText = {
  color: '#999999',
  fontSize: '13px',
  lineHeight: '1.55',
  margin: '0 0 22px',
}
const panel = {
  backgroundColor: '#111111',
  border: '1px solid #262626',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '8px 0 24px',
}
const button = {
  backgroundColor: '#3399ff',
  borderRadius: '10px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '700' as const,
  padding: '13px 20px',
  textDecoration: 'none',
}
const link = { color: '#ffffff', textDecoration: 'underline' }
const footer = {
  borderTop: '1px solid #242424',
  color: '#8f8f8f',
  fontSize: '12px',
  lineHeight: '1.55',
  margin: '30px 0 0',
  paddingTop: '18px',
}
