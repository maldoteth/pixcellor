/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
  fromAddress?: string
  fromName?: string
}

import { template as fullWorksOrderConfirmation } from './full-works-order-confirmation.tsx'
import { template as eliteOrderConfirmation } from './elite-order-confirmation.tsx'
import { template as retainerOrderConfirmation } from './retainer-order-confirmation.tsx'
import { template as internalNewOrderNotification } from './internal-new-order-notification.tsx'
import { template as projectRequirementsReminder } from './project-requirements-reminder.tsx'
import { template as orderComplete } from './order-complete.tsx'
import { template as salesWelcomeInfo } from './sales-welcome-info.tsx'
import { template as visionPreviewReady } from './vision-preview-ready.tsx'
import { template as coldOutreach } from './cold-outreach.tsx'
import { template as salesCallFollowup } from './sales-call-followup.tsx'
import { template as customInvoice } from './custom-invoice.tsx'
import { template as customerLeadNotification } from './customer-lead-notification.tsx'
import { template as subscriptionWelcomeGrowth } from './subscription-welcome-growth.tsx'
import { template as subscriptionWelcomeScale } from './subscription-welcome-scale.tsx'
import { template as subscriptionWelcomeEnterprise } from './subscription-welcome-enterprise.tsx'
import { template as subscriptionRenewalReceipt } from './subscription-renewal-receipt.tsx'
import { template as subscriptionPaymentFailed } from './subscription-payment-failed.tsx'
import { template as subscriptionCancelled } from './subscription-cancelled.tsx'
import { template as subscriptionTierChanged } from './subscription-tier-changed.tsx'
import { template as subscriptionReactivated } from './subscription-reactivated.tsx'
import { template as websiteUpdate } from './website-update.tsx'
import { template as vacancyInvitation } from './vacancy-invitation.tsx'
import { template as vacancyConfirmed } from './vacancy-confirmed.tsx'
import { template as vacancyPositionFilled } from './vacancy-position-filled.tsx'
import { template as callBookingConfirmation } from './call-booking-confirmation.tsx'
import { template as walletTransactionOtp } from './wallet-transaction-otp.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'full-works-order-confirmation': fullWorksOrderConfirmation,
  'elite-order-confirmation': eliteOrderConfirmation,
  'retainer-order-confirmation': retainerOrderConfirmation,
  'internal-new-order-notification': internalNewOrderNotification,
  'project-requirements-reminder': projectRequirementsReminder,
  'order-complete': orderComplete,
  'sales-welcome-info': salesWelcomeInfo,
  'vision-preview-ready': visionPreviewReady,
  'cold-outreach': coldOutreach,
  'sales-call-followup': salesCallFollowup,
  'custom-invoice': customInvoice,
  'customer-lead-notification': customerLeadNotification,
  'subscription-welcome-growth': subscriptionWelcomeGrowth,
  'subscription-welcome-scale': subscriptionWelcomeScale,
  'subscription-welcome-enterprise': subscriptionWelcomeEnterprise,
  'subscription-renewal-receipt': subscriptionRenewalReceipt,
  'subscription-payment-failed': subscriptionPaymentFailed,
  'subscription-cancelled': subscriptionCancelled,
  'subscription-tier-changed': subscriptionTierChanged,
  'subscription-reactivated': subscriptionReactivated,
  'website-update': websiteUpdate,
  'vacancy-invitation': vacancyInvitation,
  'vacancy-confirmed': vacancyConfirmed,
  'vacancy-position-filled': vacancyPositionFilled,
  'call-booking-confirmation': callBookingConfirmation,
  'wallet-transaction-otp': walletTransactionOtp,
}
