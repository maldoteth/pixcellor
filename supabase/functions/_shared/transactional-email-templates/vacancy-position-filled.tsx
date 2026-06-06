/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  candidateName?: string
  vacancyTitle?: string
  clientName?: string
}

const Email = ({ candidateName, vacancyTitle, clientName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>This position has been filled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Position filled</Heading>
        <Text style={text}>Hi {candidateName || 'there'},</Text>
        <Text style={text}>
          Thanks for your interest in <strong>{vacancyTitle || 'the role'}</strong>
          {clientName ? <> with <strong>{clientName}</strong></> : null}. Another candidate accepted this role
          before you, so this opening has now been filled.
        </Text>
        <Text style={text}>
          We'll be in touch with similar opportunities soon — your profile stays on our shortlist.
        </Text>
        <Section style={{ marginTop: 24 }}>
          <Text style={muted}>Pixcellor recruitment</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'This role has been filled',
  displayName: 'Vacancy: position filled',
  previewData: { candidateName: 'Alex', vacancyTitle: 'Carpenter', clientName: 'Guildford Carpentry' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: 560 }
const h1 = { color: '#000', fontSize: 22, marginBottom: 12 }
const text = { color: '#1f2937', fontSize: 14, lineHeight: '22px' }
const muted = { color: '#6b7280', fontSize: 12 }
