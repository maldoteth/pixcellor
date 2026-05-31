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
import { template as partnerLeadNotification } from './partner-lead-notification.tsx'

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
  'partner-lead-notification': partnerLeadNotification,
}
