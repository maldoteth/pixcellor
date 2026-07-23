import * as React from 'npm:react@18.3.1'
import { Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Body, Container, Html, Head, Preview, Section, Row, Column, Text,
  Header, DetailRow, main, shell, panelInner, panelTitle, nextInner, sectionKicker, text, button,
} from './_subscription-shell.tsx'

type Props = {
  customerEmail?: string
  previousTier?: string
  newTier?: string
  newAmount?: string
  billingInterval?: string
  effectiveDate?: string
  portalUrl?: string
  changeKind?: string // 'upgrade' | 'downgrade' | 'change'
}

const Email = ({ customerEmail, previousTier, newTier, newAmount, billingInterval, effectiveDate, portalUrl, changeKind }: Props) => {
  const kind = (changeKind || 'change').toLowerCase()
  const verb = kind === 'upgrade' ? 'upgraded' : kind === 'downgrade' ? 'downgraded' : 'updated'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Pixcellor subscription has been {verb}</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Header
            eyebrowText={`PLAN ${verb.toUpperCase()}`}
            title={`Your plan is now ${newTier || 'updated'}`}
            introText={`We've ${verb} your subscription${previousTier ? ` from ${previousTier}` : ''}${newTier ? ` to ${newTier}` : ''}. Here's a quick summary.`}
          />

          <Section>
            <Row>
              <Column style={panelInner}>
                <Text style={panelTitle}>Change summary</Text>
                <DetailRow label="Previous plan" value={previousTier} />
                <DetailRow label="New plan" value={newTier} />
                <DetailRow label="Billing" value={billingInterval} />
                <DetailRow label="New amount" value={newAmount} />
                <DetailRow label="Effective" value={effectiveDate} />
                <DetailRow label="Email" value={customerEmail} />
              </Column>
            </Row>
          </Section>

          <Section>
            <Row>
              <Column style={nextInner}>
                <Text style={sectionKicker}>What's next</Text>
                <Text style={text}>
                  Your billing has been prorated automatically — any difference appears on your next invoice. All the features of {newTier || 'your new plan'} are active right now.
                </Text>
                {portalUrl && <Button style={button} href={portalUrl}>Open your portal</Button>}
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const kind = (data.changeKind || 'change').toLowerCase()
    const verb = kind === 'upgrade' ? 'upgraded' : kind === 'downgrade' ? 'downgraded' : 'updated'
    return `Your Pixcellor subscription has been ${verb}`
  },
  displayName: 'Subscription tier changed',
  previewData: {
    customerEmail: 'client@example.com',
    previousTier: 'Growth',
    newTier: 'Scale',
    newAmount: '£369.00',
    billingInterval: 'Monthly',
    effectiveDate: '1 June 2026',
    portalUrl: 'https://pixcellor.com/portal',
    changeKind: 'upgrade',
  },
} satisfies TemplateEntry
