import * as React from 'npm:react@18.3.1'
import { Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Body, Container, Html, Head, Preview, Section, Row, Column, Text,
  Header, DetailRow, main, shell, panelInner, panelTitle, nextInner, sectionKicker, text, button, buttonSecondary,
} from './_subscription-shell.tsx'

type Props = {
  customerEmail?: string
  tierName?: string
  amount?: string
  billingInterval?: string
  invoiceNumber?: string
  invoicePdfUrl?: string
  invoiceHostedUrl?: string
  nextRenewalDate?: string
  portalUrl?: string
}

const Email = ({ customerEmail, tierName, amount, billingInterval, invoiceNumber, invoicePdfUrl, invoiceHostedUrl, nextRenewalDate, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Pixcellor {tierName || 'subscription'} renewal receipt</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Header
          eyebrowText="RENEWAL RECEIPT"
          title="Thanks — your renewal went through"
          introText={`Your ${tierName ? `${tierName} ` : ''}subscription has renewed. Here are your receipt details.`}
        />

        <Section>
          <Row>
            <Column style={panelInner}>
              <Text style={panelTitle}>Receipt</Text>
              <DetailRow label="Plan" value={tierName} />
              <DetailRow label="Billing" value={billingInterval} />
              <DetailRow label="Amount" value={amount} />
              <DetailRow label="Invoice" value={invoiceNumber} />
              <DetailRow label="Next renewal" value={nextRenewalDate} />
              <DetailRow label="Email" value={customerEmail} />
            </Column>
          </Row>
        </Section>

        <Section>
          <Row>
            <Column style={nextInner}>
              <Text style={sectionKicker}>Receipt & portal</Text>
              <Text style={text}>
                Download your invoice or view your billing history any time. To update your card or change plan, use Manage billing in your portal.
              </Text>
              {invoiceHostedUrl && <Button style={button} href={invoiceHostedUrl}>View invoice</Button>}
              {portalUrl && <Button style={buttonSecondary} href={portalUrl}>Open portal</Button>}
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Your Pixcellor ${data.tierName || 'subscription'} renewal receipt`,
  displayName: 'Subscription renewal receipt',
  previewData: {
    customerEmail: 'client@example.com',
    tierName: 'Scale',
    amount: '£479.00',
    billingInterval: 'Monthly',
    invoiceNumber: 'PXC-INV-1234',
    invoiceHostedUrl: 'https://invoice.stripe.com/i/example',
    nextRenewalDate: '1 August 2026',
    portalUrl: 'https://pixcellor.com/portal',
  },
} satisfies TemplateEntry
