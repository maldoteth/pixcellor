/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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
import { AuthEmailFooter } from './_footer.tsx'

const LOGO_URL = 'https://pixcellor.com/pixcellor-email-logo.png'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Pixcellor™ verification code</Preview>
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
                <Text style={eyebrow}>Pixcellor™ verification</Text>
                <Heading style={h1}>Confirm it’s you</Heading>
                <Text style={text}>Use this code to confirm your identity:</Text>
                <Text style={codeStyle}>{token}</Text>
                <AuthEmailFooter reason="You're receiving this because a verification code was requested on your Pixcellor account." />
              </Column>
            </Row>
          </Container>
        </Section>
      </Body>
    </Html>
)

export default ReauthenticationEmail

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
const codeStyle = { backgroundColor: '#161616', border: '1px solid #2b2b2b', color: '#ffffff', fontFamily: 'Courier, monospace', fontSize: '30px', fontWeight: '700' as const, letterSpacing: '4px', lineHeight: '38px', margin: '0 0 28px', padding: '12px 16px', textAlign: 'center' as const }
