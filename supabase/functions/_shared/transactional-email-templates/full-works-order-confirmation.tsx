import { createOrderEmail } from './order-confirmation-template.tsx'

export const template = createOrderEmail({
  fallbackPackage: 'Full Works',
  title: 'Your Full Works order is confirmed',
  preview: 'Your Pixcellor Full Works order is confirmed',
  nextBody: 'We’ll review your brief, confirm the key pages, and shape the first version around the strongest possible launch for your brand.',
  subjectFallback: 'Full Works',
  displayName: 'Full Works order confirmation',
  previewData: {
    requirementsUrl: 'https://pixcellor.com/project-requirements?order=PXC-ABCD-1234&token=sample',
    customerEmail: 'client@example.com',
    orderId: 'cs_test_123',
    publicOrderId: 'PXC-ABCD-1234',
    packageName: 'Full Works',
    amount: '£150.00',
    billing: 'One-time payment',
  },
})
