/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as fullWorksOrderConfirmation } from './full-works-order-confirmation.tsx'
import { template as eliteOrderConfirmation } from './elite-order-confirmation.tsx'
import { template as retainerOrderConfirmation } from './retainer-order-confirmation.tsx'
import { template as internalNewOrderNotification } from './internal-new-order-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'full-works-order-confirmation': fullWorksOrderConfirmation,
  'elite-order-confirmation': eliteOrderConfirmation,
  'retainer-order-confirmation': retainerOrderConfirmation,
  'internal-new-order-notification': internalNewOrderNotification,
}
