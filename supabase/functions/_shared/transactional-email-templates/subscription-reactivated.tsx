import * as React from 'npm:react@18.3.1'
import { Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Body, Container, Html, Head, Preview, Section, Row, Column, Text,
  Header, DetailRow, main, shell, panelInner, panelTitle, nextInner, sectionKicker, text, button,
} from './_subscription-shell.tsx'

type Props = {
  customerEmail?: string
  tierName?: string
  nextRenewalDate?: string
  portalUrl?: string
}

const Email = ({ customerEmail, tierName, nextRenewalDate, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome back — your Pixcellor subscription is active again</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Header
          eyebrowText="SUBSCRIPTION REACTIVATED"
          title="You're back in — nothing changed"
          introText={`Great news — your ${tierName ? `${tierName} ` : ''}subscription is active again. Same plan, same projects, same team. No interruption to access.`}
        />

        <Section>
          <Row>
            <Column style={panelInner}>
              <Text style={panelTitle}>Active again</Text>
              <DetailRow label="Plan" value={tierName} />
              <DetailRow label="Next renewal" value={nextRenewalDate} />
              <DetailRow label="Email" value={customerEmail} />
            </Column>
          </Row>
        </Section>

        <Section>
          <Row>
            <Column style={nextInner}>
              <Text style={sectionKicker}>Manage anytime</Text>
              <Text style={text}>
                You can change plan, update your card, or pause again from the portal whenever you need to.
              </Text>
              {portalUrl && <Button style={button} href={portalUrl}>Open portal</Button>}
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Pixcellor subscription is active again',
  displayName: 'Subscription reactivated',
  previewData: {
    customerEmail: 'client@example.com',
    tierName: 'Scale',
    nextRenewalDate: '1 August 2026',
    portalUrl: 'https://pixcellor.com/portal',
  },
} satisfies TemplateEntry
