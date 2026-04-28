import { createOrderEmail } from './order-confirmation-template.tsx'

export const template = createOrderEmail({
  fallbackPackage: 'Elite',
  title: 'Your Elite order is confirmed',
  preview: 'Your Pixcellor Elite order is confirmed',
  nextBody: 'We’ll start mapping your premium build, SEO/AEO direction, edit workflow, and the core pages that need to make the biggest impact.',
  subjectFallback: 'Elite',
  displayName: 'Elite order confirmation',
  previewData: {
    requirementsUrl: 'https://pixcellor.com/project-requirements?order=PXC-ABCD-1234&token=sample',
    customerEmail: 'client@example.com',
    orderId: 'cs_test_123',
    publicOrderId: 'PXC-ABCD-1234',
    packageName: 'Elite',
    amount: '£500.00',
    billing: 'One-time or monthly plan',
  },
})
