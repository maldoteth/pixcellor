import * as React from 'npm:react@18.3.1'
import { Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Body, Container, Html, Head, Preview, Section, Row, Column, Text,
  Header, DetailRow, main, shell, panelInner, panelTitle, nextInner, sectionKicker, text, featureItem, button,
} from './_subscription-shell.tsx'

type Props = {
  customerEmail?: string
  subscriptionId?: string
  tierName?: string
  amount?: string
  billingInterval?: string
  nextRenewalDate?: string
  portalUrl?: string
  manageBillingUrl?: string
}

const TIER_CONFIG: Record<string, {
  displayTier: string
  eyebrow: string
  title: string
  intro: string
  whatsNext: string[]
  features: string[]
  primaryCtaLabel: string
  primaryCtaPath: string
}> = {
  growth: {
    displayTier: 'Growth',
    eyebrow: 'WELCOME TO GROWTH',
    title: 'You\'re on the Growth plan',
    intro: 'Your subscription is live. You\'ve unlocked your always-on website, CRM, and AI agents — built and maintained by Pixcellor.',
    whatsNext: [
      'We\'ll email you within 1 business day to confirm onboarding and gather what we need (brand, content, integrations).',
      'Your customer portal gives you a single place to request edits, track work, and see invoices.',
      'Unlimited website edits — just reply to this email or open a request in your portal any time.',
    ],
    features: [
      'Website with unlimited edits',
      'Custom CRM access',
      'Hosting, domain & cloud',
      'AI lead generation bot',
      'AI customer support bot',
      'Analytics & tracking',
    ],
    primaryCtaLabel: 'Open your portal',
    primaryCtaPath: '/portal',
  },
  scale: {
    displayTier: 'Scale',
    eyebrow: 'WELCOME TO SCALE',
    title: 'You\'re on the Scale plan',
    intro: 'Your subscription is live. Everything in Growth plus unlimited seats, priority SLA, and monthly strategy calls with the team.',
    whatsNext: [
      'A dedicated account lead will reach out within 1 business day to schedule your kickoff and first strategy call.',
      'Priority queue is active — your edit requests jump the line and we operate on an SLA.',
      'Use your portal for requests, automations briefs, and live project status.',
    ],
    features: [
      'Everything in Growth',
      'Unlimited seats & users',
      'Unlimited edits & revisions',
      'Priority support & SLA',
      'Monthly strategy calls',
      'AI agents & automations',
    ],
    primaryCtaLabel: 'Open your portal',
    primaryCtaPath: '/portal',
  },
  enterprise: {
    displayTier: 'Enterprise',
    eyebrow: 'WELCOME TO ENTERPRISE',
    title: 'You\'re on the Enterprise plan',
    intro: 'Your subscription is live. You now have a dedicated dev and ops team, fractional CTO/CMO/CRO support, and 24/7 priority cover.',
    whatsNext: [
      'A partner-level lead from Pixcellor will be in touch within 1 business day to book your kickoff and assign your team.',
      '2-week MVP sprints start as soon as scope is agreed — daily updates land in your portal and inbox.',
      'You have a direct line to the team 24/7 — channel preferences agreed during kickoff.',
    ],
    features: [
      'Everything in Scale',
      'Fractional CTO, CMO & CRO',
      'Dedicated dev & ops team',
      '2-week MVP sprints',
      'Daily updates',
      '24/7 priority support',
    ],
    primaryCtaLabel: 'Open your portal',
    primaryCtaPath: '/portal',
  },
}

const SITE = 'https://pixcellor.com'

const buildEmail = (tierKey: 'growth' | 'scale' | 'enterprise') => {
  const cfg = TIER_CONFIG[tierKey]

  const Email = ({ customerEmail, subscriptionId, amount, billingInterval, nextRenewalDate, portalUrl, manageBillingUrl }: Props) => {
    const portalHref = portalUrl || `${SITE}${cfg.primaryCtaPath}`
    return (
      <Html lang="en" dir="ltr">
        <Head />
        <Preview>Your Pixcellor {cfg.displayTier} subscription is active</Preview>
        <Body style={main}>
          <Container style={shell}>
            <Header eyebrowText={cfg.eyebrow} title={cfg.title} introText={cfg.intro} />

            <Section>
              <Row>
                <Column style={panelInner}>
                  <Text style={panelTitle}>Subscription details</Text>
                  <DetailRow label="Plan" value={`${cfg.displayTier} Retainer`} />
                  <DetailRow label="Billing" value={billingInterval} />
                  <DetailRow label="Amount" value={amount} />
                  <DetailRow label="Next renewal" value={nextRenewalDate} />
                  <DetailRow label="Subscription ID" value={subscriptionId} />
                  <DetailRow label="Email" value={customerEmail} />
                </Column>
              </Row>
            </Section>

            <Section>
              <Row>
                <Column style={nextInner}>
                  <Text style={sectionKicker}>What's included</Text>
                  {cfg.features.map((f) => (
                    <Text key={f} style={featureItem}>• {f}</Text>
                  ))}
                </Column>
              </Row>
            </Section>

            <Section>
              <Row>
                <Column style={nextInner}>
                  <Text style={sectionKicker}>What happens next</Text>
                  {cfg.whatsNext.map((line, i) => (
                    <Text key={i} style={text}>{line}</Text>
                  ))}
                  <Button style={button} href={portalHref}>{cfg.primaryCtaLabel}</Button>
                  {manageBillingUrl && (
                    <Text style={{ ...text, marginTop: '6px' }}>
                      Need to update your card or invoice details? <a href={manageBillingUrl} style={{ color: '#ffffff', fontWeight: 700 }}>Manage billing</a>.
                    </Text>
                  )}
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Html>
    )
  }

  return {
    component: Email,
    subject: `Welcome to Pixcellor ${cfg.displayTier}`,
    displayName: `Subscription welcome – ${cfg.displayTier}`,
    previewData: {
      customerEmail: 'client@example.com',
      subscriptionId: 'sub_1Test1234',
      tierName: cfg.displayTier,
      amount: tierKey === 'growth' ? '£89.00' : tierKey === 'scale' ? '£479.00' : '£2,469.00',
      billingInterval: 'Monthly',
      nextRenewalDate: '1 July 2026',
      portalUrl: `${SITE}/portal`,
      manageBillingUrl: `${SITE}/portal?tab=billing`,
    },
  } satisfies TemplateEntry
}

export const growthTemplate = buildEmail('growth')
export const scaleTemplate = buildEmail('scale')
export const enterpriseTemplate = buildEmail('enterprise')
