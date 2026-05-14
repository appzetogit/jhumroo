/**
 * SMS Service for sending OTP
 * Supports multiple Indian SMS providers
 * Currently in development mode - returns OTP in response
 */

/**
 * Send OTP via SMS
 * @param {String} phoneNumber - Phone number to send OTP
 * @param {String} otp - OTP code to send
 * @param {String} countryCode - Country code (default: +91 for India)
 * @returns {Promise<Object>} - Result of SMS sending
 */
export const sendOTPSMS = async (phoneNumber, otp, countryCode = '+91') => {
  const fullNumber = `${countryCode}${phoneNumber}`;

  try {
    // Development Mode - Just log the OTP
    // if (process.env.NODE_ENV === 'development') {
    //   console.log(`\n📱 SMS OTP Service (Development Mode)`);
    //   console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    //   console.log(`📞 To: ${fullNumber}`);
    //   console.log(`🔐 OTP: ${otp}`);
    //   console.log(`⏰ Valid for: ${process.env.OTP_EXPIRY_MINUTES || 10} minutes`);
    //   console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    //   
    //   return {
    //     success: true,
    //     message: 'OTP sent successfully (Development mode)',
    //     otp: otp, // Return OTP in development for testing
    //     provider: 'development'
    //   };
    // }

    // Production Mode - Use SMS provider
    // PRPSMS (Indian SMS service) - Requested by user
    return await sendViaPRPSMS(fullNumber, otp);

    // Option 1: MSG91 (Popular in India)
    // return await sendViaMSG91(fullNumber, otp);

    // Option 2: Fast2SMS (Indian SMS service)
    // return await sendViaFast2SMS(fullNumber, otp);

    // Option 3: TextLocal (International + India)
    // return await sendViaTextLocal(fullNumber, otp);

    // Option 4: AWS SNS (Global service)
    // return await sendViaAWSSNS(fullNumber, otp);

    // Default: Return success without sending (for testing production build)
    // console.warn('⚠️  SMS provider not configured. OTP not sent.');
    // return {
    //   success: true,
    //   message: 'OTP generated (Provider not configured)',
    //   provider: 'none'
    // };

  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    throw new Error('Failed to send OTP SMS');
  }
};

/**
 * Send OTP via MSG91 (Indian SMS Provider)
 * Sign up at: https://msg91.com/
 */
async function sendViaMSG91(phoneNumber, otp) {
  const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
  const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
  const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'JHUMRO';

  if (!MSG91_AUTH_KEY) {
    throw new Error('MSG91_AUTH_KEY not configured');
  }

  const url = `https://api.msg91.com/api/v5/flow/`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'authkey': MSG91_AUTH_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      template_id: MSG91_TEMPLATE_ID,
      sender: MSG91_SENDER_ID,
      short_url: '0',
      mobiles: phoneNumber,
      otp: otp
    })
  });

  const data = await response.json();
  
  if (data.type === 'success') {
    return {
      success: true,
      message: 'OTP sent successfully via MSG91',
      provider: 'msg91'
    };
  } else {
    throw new Error(data.message || 'Failed to send SMS via MSG91');
  }
}

/**
 * Send OTP via Fast2SMS (Indian SMS Provider)
 * Sign up at: https://www.fast2sms.com/
 */
async function sendViaFast2SMS(phoneNumber, otp) {
  const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

  if (!FAST2SMS_API_KEY) {
    throw new Error('FAST2SMS_API_KEY not configured');
  }

  // Remove country code if present (Fast2SMS uses 10-digit numbers)
  const cleanNumber = phoneNumber.replace('+91', '');

  const url = 'https://www.fast2sms.com/dev/bulkV2';
  
  const params = new URLSearchParams({
    authorization: FAST2SMS_API_KEY,
    message: `Your Jhumroo verification code is: ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`,
    language: 'english',
    route: 'q',
    numbers: cleanNumber
  });

  const response = await fetch(`${url}?${params.toString()}`);
  const data = await response.json();
  
  if (data.return === true) {
    return {
      success: true,
      message: 'OTP sent successfully via Fast2SMS',
      provider: 'fast2sms'
    };
  } else {
    throw new Error(data.message || 'Failed to send SMS via Fast2SMS');
  }
}

/**
 * Send OTP via TextLocal (UK + India SMS Provider)
 * Sign up at: https://www.textlocal.in/
 */
async function sendViaTextLocal(phoneNumber, otp) {
  const TEXTLOCAL_API_KEY = process.env.TEXTLOCAL_API_KEY;
  const TEXTLOCAL_SENDER = process.env.TEXTLOCAL_SENDER || 'JHUMRO';

  if (!TEXTLOCAL_API_KEY) {
    throw new Error('TEXTLOCAL_API_KEY not configured');
  }

  const message = `Your Jhumroo verification code is: ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`;
  
  const params = new URLSearchParams({
    apikey: TEXTLOCAL_API_KEY,
    numbers: phoneNumber.replace('+', ''),
    message: message,
    sender: TEXTLOCAL_SENDER
  });

  const response = await fetch('https://api.textlocal.in/send/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = await response.json();
  
  if (data.status === 'success') {
    return {
      success: true,
      message: 'OTP sent successfully via TextLocal',
      provider: 'textlocal'
    };
  } else {
    throw new Error(data.errors?.[0]?.message || 'Failed to send SMS via TextLocal');
  }
}

/**
 * Send OTP via AWS SNS (Global SMS Service)
 * Requires AWS SDK configuration
 */
async function sendViaAWSSNS(phoneNumber, otp) {
  // This requires AWS SDK v3
  // npm install @aws-sdk/client-sns
  
  throw new Error('AWS SNS not implemented. Please configure AWS credentials.');
  
  // Example implementation:
  // const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
  // const snsClient = new SNSClient({ region: process.env.AWS_REGION });
  // const message = `Your Jhumroo verification code is: ${otp}`;
  // const command = new PublishCommand({
  //   PhoneNumber: phoneNumber,
  //   Message: message
  // });
  // await snsClient.send(command);
}


/**
 * Send OTP via PRPSMS (Indian SMS Provider)
 * Requested by user
 */
async function sendViaPRPSMS(phoneNumber, otp) {
  const API_KEY = process.env.PRPSMS_API_KEY;
  const SENDER_ID = process.env.PRPSMS_SENDER_ID || 'VRUHOI';
  const TEMPLATE_NAME = process.env.PRPSMS_OTP_TEMPLATE || 'temp 2';

  if (!API_KEY) {
    throw new Error('PRPSMS_API_KEY not configured');
  }

  // Ensure we only send the 10-digit mobile number to PRPSMS
  const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);


  const url = 'https://api.bulksmsadmin.com/BulkSMSapi/keyApiSendSMS/SendSmsTemplateName';

  const payload = {
    sender: SENDER_ID,
    templateName: TEMPLATE_NAME,
    smsReciever: [
      {
        mobileNo: cleanNumber,
        templateParams: String(otp)
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log('PRPSMS RESPONSE', {
      mobile: cleanNumber,
      status: response.status,
      body: data
    });

    if (response.ok && data.isSuccess === true) {
      return {
        success: true,
        message: 'OTP sent successfully via PRPSMS',
        provider: 'prpsms',
        details: data
      };
    } else {
      throw new Error(data.returnMessage || 'Failed to send SMS via PRPSMS');
    }
  } catch (error) {
    console.error('PRPSMS EXCEPTION', {
      error: error.message
    });
    throw error;
  }
}

export default {
  sendOTPSMS
};
