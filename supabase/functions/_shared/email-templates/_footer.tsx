/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Column, Hr, Link, Row, Section, Text } from 'npm:@react-email/components@0.0.22'

interface AuthEmailFooterProps {
  reason: string
}

export const AuthEmailFooter = ({ reason }: AuthEmailFooterProps) => (
  <Section style={footerWrap}>
    <Hr style={divider} />
    <Text style={brandLine}>Pixcellor™</Text>
    <Text style={tagline}>Digital Services</Text>
    <Text style={reasonText}>{reason}</Text>
    <Text style={linksRow}>
      <Link href="https://pixcellor.com/legal" style={footerLink}>Privacy</Link>
      {' · '}
      <Link href="mailto:hello@pixcellor.com" style={footerLink}>Contact</Link>
      {' · '}
      <Link href="https://pixcellor.com" style={footerLink}>pixcellor.com</Link>
    </Text>
    <Text style={addressLine}>Pixcellor · United Kingdom</Text>
    <Text style={copyright}>© 2026 Pixcellor. All rights reserved.</Text>
  </Section>
)

export default AuthEmailFooter

const footerWrap = { margin: '32px 0 0', padding: '0' }
const divider = { borderColor: '#1f1f1f', borderWidth: '0 0 1px', margin: '0 0 18px' }
const brandLine = { color: '#fafafa', fontSize: '13px', fontWeight: '800' as const, letterSpacing: '0.3px', lineHeight: '18px', margin: '0 0 4px' }
const tagline = { color: '#8a8a8a', fontSize: '12px', lineHeight: '18px', margin: '0 0 14px' }
const reasonText = { color: '#8a8a8a', fontSize: '12px', lineHeight: '18px', margin: '0 0 12px' }
const linksRow = { color: '#8a8a8a', fontSize: '12px', lineHeight: '18px', margin: '0 0 12px' }
const footerLink = { color: '#ffffff', textDecoration: 'underline' }
const addressLine = { color: '#8a8a8a', fontSize: '12px', lineHeight: '18px', margin: '0 0 4px' }
const copyright = { color: '#666666', fontSize: '11px', lineHeight: '16px', margin: '0' }
