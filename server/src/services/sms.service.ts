// Meta Chat SMS Service for Carrier Mobile Delivery
// Supports Ethiopia (Ethio Telecom, Safaricom), Saudi Arabia, Qatar, UAE, Lebanon, Canada, Jordan, etc.

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string;
  carrierName?: string;
  error?: string;
}

export class SmsService {
  /**
   * Validates and normalizes phone number to E.164 standard based on country dialing code.
   */
  static validatePhoneNumber(countryCode: string, localNumber: string): PhoneValidationResult {
    const cleanLocal = localNumber.replace(/[\s\-\(\)]/g, '').replace(/^0+/, '');

    if (!cleanLocal || !/^\d+$/.test(cleanLocal)) {
      return {
        isValid: false,
        e164: '',
        error: 'Please enter a valid numeric phone number without special characters.',
      };
    }

    const e164 = `${countryCode}${cleanLocal}`;
    let carrierName = '';

    // Country-specific carrier & format validation
    switch (countryCode) {
      case '+251': { // Ethiopia
        if (cleanLocal.length !== 9) {
          return {
            isValid: false,
            e164,
            error: 'Ethiopian phone numbers must be 9 digits after +251 (e.g. 91 123 4567 or 71 234 5678).',
          };
        }
        if (cleanLocal.startsWith('9')) {
          carrierName = 'Ethio Telecom (ኢትዮ ቴሌኮም)';
        } else if (cleanLocal.startsWith('7')) {
          carrierName = 'Safaricom Ethiopia (ሳፋሪኮም)';
        } else {
          return {
            isValid: false,
            e164,
            error: 'Ethiopian numbers must start with 9 (Ethio Telecom) or 7 (Safaricom Ethiopia).',
          };
        }
        break;
      }

      case '+966': { // Saudi Arabia
        if (cleanLocal.length !== 9 || !cleanLocal.startsWith('5')) {
          return {
            isValid: false,
            e164,
            error: 'Saudi Arabia numbers must be 9 digits starting with 5 (e.g. 50 123 4567).',
          };
        }
        carrierName = 'Saudi Carrier (STC / Mobily / Zain)';
        break;
      }

      case '+974': { // Qatar
        if (cleanLocal.length !== 8) {
          return {
            isValid: false,
            e164,
            error: 'Qatar numbers must be 8 digits (e.g. 33 12 34 56).',
          };
        }
        carrierName = 'Qatar Carrier (Ooredoo / Vodafone)';
        break;
      }

      case '+971': { // UAE / Dubai
        if (cleanLocal.length !== 9 || !cleanLocal.startsWith('5')) {
          return {
            isValid: false,
            e164,
            error: 'UAE/Dubai numbers must be 9 digits starting with 5 (e.g. 50 123 4567).',
          };
        }
        carrierName = 'UAE Carrier (e& / du)';
        break;
      }

      case '+961': { // Lebanon / Beirut
        if (cleanLocal.length < 7 || cleanLocal.length > 8) {
          return {
            isValid: false,
            e164,
            error: 'Lebanon numbers must be 7 to 8 digits (e.g. 3 123 456).',
          };
        }
        carrierName = 'Lebanon Carrier (Touch / Alfa)';
        break;
      }

      case '+1': { // Canada / USA
        if (cleanLocal.length !== 10) {
          return {
            isValid: false,
            e164,
            error: 'Canada/US numbers must be 10 digits including area code.',
          };
        }
        carrierName = 'North American Carrier';
        break;
      }

      case '+962': { // Jordan
        if (cleanLocal.length !== 9 || !cleanLocal.startsWith('7')) {
          return {
            isValid: false,
            e164,
            error: 'Jordan numbers must be 9 digits starting with 7 (e.g. 7 9123 4567).',
          };
        }
        carrierName = 'Jordan Carrier (Zain / Orange / Umniah)';
        break;
      }

      default:
        carrierName = 'International Network';
        break;
    }

    return {
      isValid: true,
      e164,
      carrierName,
    };
  }

  /**
   * Checks whether live SMS credentials (e.g. Twilio) are configured in the environment.
   */
  static isConfigured(): boolean {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
    return !!(
      twilioSid &&
      twilioAuth &&
      twilioFrom &&
      !twilioSid.includes('your_') &&
      !twilioAuth.includes('your_') &&
      twilioSid.trim().length > 10 &&
      twilioAuth.trim().length > 10
    );
  }

  /**
   * Dispatches real SMS OTP via Twilio REST API if configured,
   * or returns truthful status with instructions.
   */
  static async sendOtpSms(phone: string, otpCode: string): Promise<{
    delivered: boolean;
    provider: string;
    message: string;
    error?: string;
  }> {
    const isConfigured = this.isConfigured();
    const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN?.trim();
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER?.trim();

    const messageBody = `Your Meta Chat verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`;

    // Check if live Twilio SMS credentials are provided
    if (isConfigured && twilioSid && twilioAuth && twilioFrom) {
      try {
        const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
        const params = new URLSearchParams({
          To: phone,
          From: twilioFrom,
          Body: messageBody,
        });

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        const data: any = await response.json();
        if (response.ok) {
          console.log(`[SMS Gateway] Real SMS successfully dispatched to ${phone} (Message SID: ${data.sid})`);
          return {
            delivered: true,
            provider: 'Twilio SMS Gateway',
            message: `Verification code successfully sent via SMS to ${phone}.`,
          };
        } else {
          console.error(`[SMS Gateway Provider Error]:`, data.message || data);
          return {
            delivered: false,
            provider: 'Twilio SMS Gateway',
            message: 'Unable to deliver SMS to this carrier. Please verify the phone number format or try again.',
            error: data.message || 'Telecommunications carrier rejected the message delivery request.',
          };
        }
      } catch (err: any) {
        console.error(`[SMS Gateway Network Error]:`, err.message);
        return {
          delivered: false,
          provider: 'Twilio SMS Gateway',
          message: 'Network error connecting to SMS delivery service. Please try again.',
          error: err.message,
        };
      }
    }

    // When live credentials have not yet been provided in server/.env:
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Meta Chat Dev] Live SMS gateway not configured. Verification code generated for ${phone}: ${otpCode}`);
    }

    return {
      delivered: false,
      provider: 'Unconfigured Gateway',
      message: 'SMS verification gateway is currently not configured on this server.',
      error: 'SMS_GATEWAY_NOT_CONFIGURED',
    };
  }
}

