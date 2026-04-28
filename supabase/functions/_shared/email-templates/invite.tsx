/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have been invited to Pixcellor™</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Img src="https://pixcellor.com/pixcellor-email-logo.png" alt="Pixcellor" style={logo} />
          <Text style={eyebrow}>Pixcellor™ admin access</Text>
          <Heading style={h1}>You have been invited</Heading>
          <Text style={text}>
            Accept your invitation to access Pixcellor’s portal.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation
          </Button>
          <Text style={footer}>
            If you were not expecting this, you can ignore it. Visit 
            <Link href={siteUrl} style={link}>Pixcellor</Link> any time.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0',
  padding: '0',
}
const container = { width: '100%', maxWidth: '560px', margin: '0 auto', padding: '32px 20px' }
const card = {
  backgroundColor: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '12px',
  padding: '32px 28px',
  boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
}
const logo = { width: '156px', height: 'auto', margin: '0 0 28px' }
const eyebrow = {
  color: '#9a9a9a',
  fontSize: '12px',
  fontWeight: '700' as const,
  lineHeight: '1.4',
  letterSpacing: '0',
  margin: '0 0 10px',
}
const h1 = {
  color: '#f2f2f2',
  fontSize: '28px',
  fontWeight: '700' as const,
  lineHeight: '1.15',
  letterSpacing: '0',
  margin: '0 0 18px',
}
const text = {
  color: '#c8c8c8',
  fontSize: '15px',
  lineHeight: '1.65',
  margin: '0 0 22px',
}
const link = { color: '#ffffff', textDecoration: 'underline' }
const button = {
  backgroundColor: '#ffffff',
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: '700' as const,
  borderRadius: '4px',
  padding: '13px 22px',
  textDecoration: 'none',
  boxShadow: '0 10px 28px rgba(255,255,255,0.16)',
}
const footer = {
  color: '#8f8f8f',
  fontSize: '12px',
  lineHeight: '1.55',
  margin: '30px 0 0',
}
