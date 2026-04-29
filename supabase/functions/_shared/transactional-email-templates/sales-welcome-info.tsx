import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND_NAME = 'Pixcellor™'
const LOGO_URL = 'https://pixcellor.com/pixcellor-email-logo.png'
const SITE_URL = 'https://pixcellor.com'

type SalesWelcomeProps = {
  name?: string
  email?: string
}

const PackageBlock = ({ name, price, body, href }: { name: string; price: string; body: string; href: string }) => (
  <Section style={packagePanel}>
    <Row>
      <Column>
        <Text style={packageName}>{name}</Text>
        <Text style={packagePrice}>{price}</Text>
        <Text style={packageText}>{body}</Text>
        <Button style={smallButton} href={href}>Choose {name}</Button>
      </Column>
    </Row>
  </Section>
)

const SalesWelcomeEmail = ({ name }: SalesWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Pixcellor packages, process, portfolio and buy links</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={hero}>
          <Row style={brandRow}>
            <Column><Text style={brand}>{BRAND_NAME}</Text></Column>
            <Column style={markColumn}><Img src={LOGO_URL} alt="Pixcellor" width="40" height="40" style={mark} /></Column>
          </Row>
          <Text style={eyebrow}>WEBSITE BUILDS WITHOUT THE BACK-AND-FORTH</Text>
          <Heading style={h1}>{name ? `${name}, here’s how Pixcellor works` : 'Here’s how Pixcellor works'}</Heading>
          <Text style={intro}>Buy the package that fits, add your brief online, request edits in your customer portal, then take delivery automatically. Every build includes a 28-day money-back guarantee and a lifetime warranty, so you are protected long after launch.</Text>
          <Button style={button} href={SITE_URL}>View packages and buy</Button>
        </Section>

        <Section style={section}>
          <Text style={sectionTitle}>Pick the right build</Text>
          <PackageBlock name="Full Works" price="£150" href={`${SITE_URL}/#pricing`} body="A sharp custom website for standard brands, up to 3 pages, with our lifetime guarantee. Best for simple launch-ready sites." />
          <PackageBlock name="Elite" price="£500 one-time" href={`${SITE_URL}/#pricing`} body="Our most popular option: up to 10 pages, SEO & AEO optimisation, unlimited edit requests and a higher-end finish." />
          <PackageBlock name="Retainer" price="£1,200/mo or £12,000/yr" href={`${SITE_URL}/#pricing`} body="Your own tech department for large sites, full apps, automations and ongoing development with rapid turnarounds." />
        </Section>

        <Section style={sectionAlt}>
          <Text style={sectionTitle}>Prefer to see it first?</Text>
          <Text style={text}>Speak to sales and we can make your site before you buy. You only pay if you are happy with the result, and your purchase is still backed by our 28-day money-back guarantee plus lifetime warranty.</Text>
          <Button style={button} href={SITE_URL}>Speak to sales</Button>
        </Section>

        <Section style={section}>
          <Text style={sectionTitle}>The process</Text>
          <Text style={listItem}>1. Buy the package that matches your project.</Text>
          <Text style={listItem}>2. Add your brief, pages, copy, brand colours, images and references in one clean form.</Text>
          <Text style={listItem}>3. Track progress, make edit requests and receive delivery through your portal.</Text>
          <Text style={listItem}>4. Launch with hosting-ready, modern, AI-aware web technology built to scale.</Text>
        </Section>

        <Section style={section}>
          <Text style={sectionTitle}>Proof we can build serious products</Text>
          <Text style={text}>We’ve built platforms across creator tools, Web3, recruitment, analytics, agencies and customer portals — including DeHub, Bricks, TikUp, Holder Chat, First Class Agency, SEC Digital and more.</Text>
          <Button style={button} href={SITE_URL}>Explore portfolio</Button>
        </Section>

        <Section style={finalCta}>
          <Heading style={h2}>Ready to skip the meetings and get the site moving?</Heading>
          <Text style={text}>Choose your package, submit the brief, and we’ll take it from there.</Text>
          <Button style={buttonDark} href={SITE_URL}>Start your build</Button>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SalesWelcomeEmail,
  subject: 'How Pixcellor builds your website — packages, process and portfolio',
  displayName: 'Sales welcome information',
  previewData: { name: 'Jamie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', padding: '42px 14px' }
const shell = { backgroundColor: '#070707', border: '1px solid #262626', maxWidth: '640px' }
const hero = { padding: '34px 34px 28px', borderBottom: '1px solid #202020' }
const brandRow = { margin: '0 0 28px' }
const brand = { color: '#ffffff', fontSize: '14px', fontWeight: '800' as const, letterSpacing: '0', margin: '0' }
const markColumn = { textAlign: 'right' as const, verticalAlign: 'top' as const, width: '46px' }
const mark = { display: 'block', margin: '0', width: '40px', height: '40px' }
const eyebrow = { color: '#a3a3a3', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '0.08em', lineHeight: '1.4', margin: '0 0 12px', textTransform: 'uppercase' as const }
const h1 = { color: '#ffffff', fontSize: '30px', fontWeight: '800' as const, letterSpacing: '0', lineHeight: '1.15', margin: '0 0 16px' }
const h2 = { color: '#ffffff', fontSize: '24px', fontWeight: '800' as const, letterSpacing: '0', lineHeight: '1.18', margin: '0 0 12px' }
const intro = { color: '#d7d7d7', fontSize: '16px', lineHeight: '1.65', margin: '0 0 18px' }
const section = { padding: '28px 34px 10px' }
const sectionAlt = { padding: '26px 34px 18px', borderTop: '1px solid #202020', borderBottom: '1px solid #202020', backgroundColor: '#0d0d0d' }
const sectionTitle = { color: '#ffffff', fontSize: '17px', fontWeight: '800' as const, lineHeight: '1.35', margin: '0 0 14px' }
const text = { color: '#d0d0d0', fontSize: '15px', lineHeight: '1.7', margin: '0 0 16px' }
const listItem = { color: '#d0d0d0', fontSize: '14px', lineHeight: '1.65', margin: '0 0 10px' }
const packagePanel = { border: '1px solid #262626', backgroundColor: '#101010', padding: '16px', margin: '0 0 12px' }
const packageName = { color: '#ffffff', fontSize: '15px', fontWeight: '800' as const, margin: '0 0 4px' }
const packagePrice = { color: '#ffffff', fontSize: '22px', fontWeight: '900' as const, margin: '0 0 8px' }
const packageText = { color: '#cfcfcf', fontSize: '13px', lineHeight: '1.6', margin: '0 0 12px' }
const button = { backgroundColor: '#ffffff', borderRadius: '10px', color: '#050505', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, margin: '2px 0 8px', padding: '13px 18px', textDecoration: 'none' }
const smallButton = { backgroundColor: '#ffffff', borderRadius: '8px', color: '#050505', display: 'inline-block', fontSize: '12px', fontWeight: '800' as const, padding: '10px 13px', textDecoration: 'none' }
const buttonDark = { backgroundColor: '#070707', border: '1px solid #ffffff', borderRadius: '10px', color: '#ffffff', display: 'inline-block', fontSize: '14px', fontWeight: '800' as const, padding: '13px 18px', textDecoration: 'none' }
const finalCta = { padding: '28px 34px 34px', backgroundColor: '#151515', borderTop: '1px solid #2a2a2a' }