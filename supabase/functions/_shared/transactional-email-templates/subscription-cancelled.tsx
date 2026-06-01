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
  endDate?: string
  reactivateUrl?: string
}

const Email = ({ customerEmail, tierName, endDate, reactivateUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Pixcellor subscription has been cancelled</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Header
          eyebrowText="SUBSCRIPTION CANCELLED"
          title="Your subscription is cancelled"
          introText={`We've cancelled your ${tierName ? `${tierName} ` : ''}subscription. ${endDate ? `You'll keep access until ${endDate}.` : 'Your access has ended.'} If this was a mistake, you can reactivate any time.`}
        />

        <Section>
          <Row>
            <Column style={panelInner}>
              <Text style={panelTitle}>Cancellation</Text>
              <DetailRow label="Plan" value={tierName} />
              <DetailRow label="Access ends" value={endDate} />
              <DetailRow label="Email" value={customerEmail} />
            </Column>
          </Row>
        </Section>

        <Section>
          <Row>
            <Column style={nextInner}>
              <Text style={sectionKicker}>Changed your mind?</Text>
              <Text style={text}>
                One-click reactivation keeps everything exactly where you left it — same plan, same projects, same team. If you cancelled because something wasn't working, just reply to this email and we'll make it right.
              </Text>
              {reactivateUrl && <Button style={button} href={reactivateUrl}>Reactivate subscription</Button>}
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Pixcellor subscription is cancelled',
  displayName: 'Subscription cancelled',
  previewData: {
    customerEmail: 'client@example.com',
    tierName: 'Scale',
    endDate: '1 July 2026',
    reactivateUrl: 'https://pixcellor.com/portal?tab=billing',
  },
} satisfies TemplateEntry
