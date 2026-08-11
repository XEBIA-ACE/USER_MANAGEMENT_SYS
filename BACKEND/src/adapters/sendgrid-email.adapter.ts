```typescript
import sgMail from '@sendgrid/mail';
import { EmailDeliveryPort } from './email-delivery.port';
import { appConfig } from '../config/app.config';

sgMail.setApiKey(appConfig.sendgridApiKey);

export class SendGridEmailAdapter implements EmailDeliveryPort {
  async sendUserProfileConfirmationEmail(userEmail: string, userName: string): Promise<void> {
    const msg = {
      to: userEmail,
      from: {
        email: appConfig.fromEmail,
        name: appConfig.fromName,
      },
      subject: 'Profile Successfully Created',
      html: `<p>Hello ${userName},</p><p>Your profile has been successfully created. Welcome to our platform!</p><p>Best regards,<br/>The Team</p>`,
    };

    try {
      await sgMail.send(msg);
      console.log(`Confirmation email sent to ${userEmail}`);
    } catch (error: any) {
      console.error(`Error sending email to ${userEmail}: `, error);
    }
  }
}
```