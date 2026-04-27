Plan to set up branded auth email templates for Pixcellor:

1. Create the auth email template system
   - Add branded templates for signup confirmation, password reset, magic link, invite, email change, and reauthentication/OTP emails.
   - Keep the auth email flow connected to the existing Lovable Cloud email setup.

2. Apply Pixcellor branding
   - Use Pixcellor™ naming and concise, premium agency-style copy.
   - Match the app’s visual identity: minimal black/white brand, system-ui font stack, rounded cards, subtle borders, white email body for inbox compatibility, and blue CTA accents where appropriate.
   - Add the existing Pixcellor logo/wordmark if it can be safely hosted for email use.

3. Deploy the email handler
   - Deploy the backend email handler so the auth system uses the new templates.
   - Auth emails will continue to activate automatically once `notify.pixcellor.com` finishes DNS verification.

4. Provide preview links
   - After implementation, I’ll include links to preview the main branded auth emails, especially signup confirmation and password reset.

Technical details:
- The email domain `notify.pixcellor.com` is already configured but still verifying DNS; template setup can proceed now.
- I will not change the existing generated backend client files.
- I will not add any third-party email service or external API key.
- Any files under the backend email functions will be deployed after editing, because template changes do not take effect until deployed.