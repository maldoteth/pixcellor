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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const BRAND_NAME = 'Pixcellor™'

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have been invited to Pixcellor</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{BRAND_NAME}</Text>
        <Heading style={h1}>Your Pixcellor invite</Heading>
        <Text style={text}>
          You have been invited to access the Pixcellor portal. Accept the invite to create your secure account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept invite
        </Button>
        <Text style={footer}>
          Not expecting this? You can ignore it, or visit <Link href={siteUrl} style={link}>pixcellor.com</Link> to learn more.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
