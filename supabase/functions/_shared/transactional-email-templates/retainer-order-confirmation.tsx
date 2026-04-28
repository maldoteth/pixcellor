import { createOrderEmail } from './order-confirmation-template.tsx'

export const template = createOrderEmail({
  fallbackPackage: 'Retainer',
  title: 'Your Retainer is confirmed',
  preview: 'Your Pixcellor Retainer is confirmed',
  nextBody: 'We’ll treat this as your ongoing tech department and align on priorities, response cadence, and the first sprint of work.',
  subjectFallback: 'Retainer',
  displayName: 'Retainer order confirmation',
  previewData: {
    requirementsUrl: 'https://pixcellor.com/project-requirements?order=PXC-ABCD-1234&token=sample',
    customerEmail: 'client@example.com',
    orderId: 'cs_test_123',
    publicOrderId: 'PXC-ABCD-1234',
    packageName: 'Retainer',
    amount: '£1,200.00',
    billing: 'Subscription',
  },
})
