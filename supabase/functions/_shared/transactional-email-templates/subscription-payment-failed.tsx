import * as React from 'npm:react@18.3.1'
import { Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Body, Container, Html, Head, Preview, Section, Row, Column, Text,
  Header, DetailRow, main, shell, panelInner, panelTitle, nextInner, sectionKicker, text, button, alertBox,
} from './_subscription-shell.tsx'

type Props = {
  customerEmail?: string
  tierName?: string
  amount?: string
  invoiceHostedUrl?: string
  nextAttemptDate?: string
  portalUrl?: string
}

const Email = ({ customerEmail, tierName, amount, invoiceHostedUrl, nextAttemptDate, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Action needed — your Pixcellor subscription payment failed</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Header
          eyebrowText="PAYMENT FAILED"
          title="Your payment didn't go through"
          introText={`We tried to charge your card for your ${tierName ? `${tierName} ` : ''}subscription and it was declined. Your service stays active for a short grace period — please update your card to avoid interruption.`}
        />

        <Section>
          <Row>
            <Column style={panelInner}>
              <Text style={alertBox}>
                {nextAttemptDate
                  ? `We'll automatically retry on ${nextAttemptDate}. Update your card before then to skip the retry.`
                  : 'We\'ll automatically retry over the next few days. Update your card to skip the retry.'}
              </Text>
              <Text style={panelTitle}>Subscription</Text>
              <DetailRow label="Plan" value={tierName} />
              <DetailRow label="Amount due" value={amount} />
              <DetailRow label="Email" value={customerEmail} />
            </Column>
          </Row>
        </Section>

        <Section>
          <Row>
            <Column style={nextInner}>
              <Text style={sectionKicker}>Fix it in one click</Text>
              <Text style={text}>
                Update your card directly on the secure invoice page. If you'd prefer, you can also reply to this email and we'll help.
              </Text>
              {invoiceHostedUrl && <Button style={button} href={invoiceHostedUrl}>Update card & pay</Button>}
              {portalUrl && (
                <Text style={{ ...text, marginTop: '10px' }}>
                  Or open your <a href={portalUrl} style={{ color: '#ffffff', fontWeight: 700 }}>portal</a>.
                </Text>
              )}
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Action needed: your Pixcellor ${data.tierName || 'subscription'} payment failed`,
  displayName: 'Subscription payment failed',
  previewData: {
    customerEmail: 'client@example.com',
    tierName: 'Scale',
    amount: '£369.00',
    invoiceHostedUrl: 'https://invoice.stripe.com/i/example',
    nextAttemptDate: '8 June 2026',
    portalUrl: 'https://pixcellor.com/portal',
  },
} satisfies TemplateEntry
