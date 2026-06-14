import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor'

type Props = {
  name?: string
  whenLabel?: string // pre-formatted, e.g. "Tuesday, 17 June 2026 at 10:30 (BST)"
  preferenceLabel?: string // human label like "Anytime callback"
  phone?: string
  brief?: string
  callLink?: string // present only when a specific slot is booked
}

const Email = ({ name, whenLabel, preferenceLabel, phone, brief, callLink }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {whenLabel ? `Your call with ${BRAND_NAME} is booked for ${whenLabel}` : `Your call with ${BRAND_NAME} is booked`}
    </Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={section}>
          <Heading style={h1}>{name ? `Hi ${name},` : 'Hi,'}</Heading>
          <Text style={text}>
            Thanks for booking a free strategy call with {BRAND_NAME}. We&apos;ve got you in the diary.
          </Text>
          <Text style={tip}>
            Forwarding this to a colleague? Ask them to whitelist <strong>pixcellor.com</strong> so the call link doesn&apos;t get blocked by their spam filter.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>YOUR CALL</Text>
            <Text style={cardValue}>
              {whenLabel ? whenLabel : preferenceLabel || 'We will call you back shortly'}
            </Text>
            {phone ? (
              <Text style={cardMeta}>We&apos;ll call you on {phone}</Text>
            ) : null}
          </Section>

          {callLink ? (
            <Section style={{ textAlign: 'center' as const, margin: '8px 0 20px' }}>
              <Button href={callLink} style={cta}>
                Join the video call
              </Button>
              <Text style={cardMeta}>
                Or paste this link in your browser at call time:<br />
                <span style={{ wordBreak: 'break-all' as const }}>{callLink}</span>
              </Text>
            </Section>
          ) : null}

          {brief ? (
            <>
              <Text style={textMuted}>What you told us:</Text>
              <Text style={quote}>&ldquo;{brief}&rdquo;</Text>
            </>
          ) : null}

          <Hr style={hr} />

          <Text style={text}>
            <strong>What happens next?</strong>
          </Text>
          <Text style={text}>
            One of our team will call you at the scheduled time. We&apos;ll spend ~15 minutes
            understanding what you need, then send through an AI-generated preview of your
            site within 24 hours — no obligation.
          </Text>

          <Text style={text}>
            Need to reschedule or share something before the call? Just reply to this email —
            it comes straight to us.
          </Text>

          <Text style={signoff}>
            — The {BRAND_NAME} team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.whenLabel
      ? `Your Pixcellor call is booked — ${data.whenLabel}`
      : 'Your Pixcellor call is booked',
  displayName: 'Call booking confirmation',
  previewData: {
    name: 'Jamie',
    whenLabel: 'Tuesday, 17 June 2026 at 10:30 (BST)',
    phone: '+44 7700 900000',
    brief: 'I run a small bakery and need a booking site.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '32px 14px' }
const shell = { backgroundColor: '#ffffff', maxWidth: '560px', margin: '0 auto' }
const section = { padding: '8px 4px' }
const h1 = { color: '#111111', fontSize: '20px', fontWeight: '600' as const, lineHeight: '1.3', margin: '0 0 16px' }
const text = { color: '#333333', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px' }
const textMuted = { color: '#666666', fontSize: '13px', lineHeight: '1.5', margin: '20px 0 6px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const quote = { color: '#333333', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px', borderLeft: '3px solid #111111', padding: '6px 0 6px 14px', fontStyle: 'italic' as const }
const card = { backgroundColor: '#f6f6f6', border: '1px solid #e5e5e5', padding: '18px 20px', margin: '20px 0' }
const cardLabel = { color: '#666666', fontSize: '11px', fontWeight: '600' as const, letterSpacing: '0.12em', margin: '0 0 6px' }
const cardValue = { color: '#111111', fontSize: '18px', fontWeight: '600' as const, lineHeight: '1.35', margin: '0 0 6px' }
const cardMeta = { color: '#444444', fontSize: '13px', lineHeight: '1.4', margin: '4px 0 0' }
const hr = { borderColor: '#eaeaea', margin: '24px 0' }
const signoff = { color: '#333333', fontSize: '15px', lineHeight: '1.6', margin: '24px 0 0' }
const cta = { backgroundColor: '#111111', color: '#ffffff', padding: '12px 22px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' as const, fontSize: '15px', display: 'inline-block' as const }
const tip = { color: '#666666', fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const }
