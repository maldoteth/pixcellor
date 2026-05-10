/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { AuthEmailFooter } from './_footer.tsx'

const LOGO_URL = 'https://pixcellor.com/pixcellor-email-logo.png'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Confirm your Pixcellor™ email change</Preview>
      <Body style={main}>
        <Section style={outer}>
          <Container style={container}>
            <Row>
              <Column style={inner}>
                <Row style={brandRow}>
                  <Column style={markColumn}>
                    <Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} />
                  </Column>
                  <Column style={brandColumn}>
                    <Text style={brand}>Pixcellor™</Text>
                  </Column>
                </Row>
                <Text style={eyebrow}>Pixcellor™ account security</Text>
                <Heading style={h1}>Confirm your email change</Heading>
                <Text style={text}>
                  Confirm the change from <Link href={`mailto:${email}`} style={link}>{email}</Link> to <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
                </Text>
                <Button style={button} href={confirmationUrl}>
                  Confirm Change
                </Button>
                <AuthEmailFooter reason="You're receiving this because an email change was requested on your Pixcellor account." />
              </Column>
            </Row>
          </Container>
        </Section>
      </Body>
    </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: '0', padding: '0' }
const outer = { backgroundColor: '#ffffff', padding: '28px 12px' }
const container = { backgroundColor: '#0a0a0a', border: '1px solid #252525', width: '100%', maxWidth: '560px' }
const inner = { padding: '32px' }
const brandRow = { margin: '0 0 28px' }
const markColumn = { width: '44px', verticalAlign: 'middle' as const }
const mark = { display: 'block', margin: '0', width: '40px', height: '40px' }
const brandColumn = { verticalAlign: 'middle' as const }
const brand = { color: '#ffffff', fontSize: '13px', fontWeight: '800' as const, letterSpacing: '0.3px', lineHeight: '20px', margin: '0' }
const eyebrow = { color: '#a3a3a3', fontSize: '12px', fontWeight: '700' as const, lineHeight: '18px', margin: '0 0 10px' }
const h1 = { color: '#fafafa', fontSize: '26px', fontWeight: '800' as const, lineHeight: '32px', margin: '0 0 18px' }
const text = { color: '#cfcfcf', fontSize: '16px', lineHeight: '26px', margin: '0 0 22px' }
const link = { color: '#ffffff', textDecoration: 'underline' }
const button = { backgroundColor: '#ffffff', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, lineHeight: '18px', padding: '13px 22px', textDecoration: 'none' }
