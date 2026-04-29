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
  Preview,
  Row,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://pixcellor.com/pixcellor-email-logo.png'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Reset your Pixcellor™ password</Preview>
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
                <Heading style={h1}>Reset your password</Heading>
                <Text style={text}>
                  Use the button below to choose a new password for your Pixcellor account.
                </Text>
                <Button style={button} href={confirmationUrl}>
                  Reset Password
                </Button>
                <Text style={footer}>
                  If you did not request a password reset, you can safely ignore this.
                </Text>
              </Column>
            </Row>
          </Container>
        </Section>
      </Body>
    </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  margin: '0',
  padding: '0',
}
const outer = {
  backgroundColor: '#ffffff',
  padding: '28px 12px',
}
const container = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #252525',
  width: '100%',
  maxWidth: '560px',
}
const inner = {
  padding: '30px 28px 28px',
}
const brandRow = {
  margin: '0 0 28px',
}
const markColumn = {
  width: '44px',
  verticalAlign: 'middle' as const,
}
const mark = {
  display: 'block',
  margin: '0',
  width: '40px',
  height: '40px',
}
const brandColumn = {
  verticalAlign: 'middle' as const,
}
const brand = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '800' as const,
  lineHeight: '20px',
  margin: '0',
}
const eyebrow = {
  color: '#a3a3a3',
  fontSize: '12px',
  fontWeight: '700' as const,
  lineHeight: '18px',
  letterSpacing: '0',
  margin: '0 0 10px',
}
const h1 = {
  color: '#f7f7f7',
  fontSize: '28px',
  fontWeight: '800' as const,
  lineHeight: '34px',
  letterSpacing: '0',
  margin: '0 0 18px',
}
const text = {
  color: '#d0d0d0',
  fontSize: '15px',
  lineHeight: '25px',
  margin: '0 0 22px',
}
const link = {
  color: '#ffffff',
  textDecoration: 'underline',
}
const button = {
  backgroundColor: '#ffffff',
  color: '#050505',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '800' as const,
  lineHeight: '18px',
  padding: '13px 22px',
  textDecoration: 'none',
}
const footer = {
  borderTop: '1px solid #242424',
  color: '#969696',
  fontSize: '12px',
  lineHeight: '19px',
  margin: '28px 0 0',
  padding: '18px 0 0',
}
