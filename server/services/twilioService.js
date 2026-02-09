const twilio = require('twilio');
const database = require('../config/database.js');
const { v4: uuidv4 } = require('uuid');
const { encrypt, decrypt } = require('../utils/encryption.js');

class TwilioService {
  constructor() { }

  // Get Twilio client for a specific user's account
  getClientForUser(accountSid, authToken) {
    return twilio(accountSid, authToken);
  }

  // Add a Twilio number for a user (with automatic verification)
  async addTwilioNumber(userId, phoneNumber, region, accountSid, authToken) {
    try {
      const client = this.getClientForUser(accountSid, authToken);

      // Validate account exists
      await client.api.accounts(accountSid).fetch();

      const incomingNumbers = await client.incomingPhoneNumbers.list({ phoneNumber });
      if (!incomingNumbers || incomingNumbers.length === 0) {
        throw new Error('Phone number not found in your Twilio account');
      }
      const twilioNumber = incomingNumbers[0];

      // Auto-verify path
      const verificationCode = '123456';
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Upsert into user_twilio_numbers
      const [existingRows] = await database.execute(
        'SELECT id FROM user_twilio_numbers WHERE user_id = ? AND phone_number = ?',
        [userId, phoneNumber]
      ).catch(err => { throw new Error(`DB error (user_twilio_numbers select): ${err.message}`); });

      let id = (existingRows && existingRows.length > 0) ? existingRows[0].id : uuidv4();
      const encryptedAuthToken = encrypt(authToken);

      if (existingRows && existingRows.length > 0) {
        await database.execute(
          `UPDATE user_twilio_numbers 
           SET twilio_account_sid = ?, twilio_auth_token = ?, region = ?, 
               verification_code = ?, verification_expires_at = ?, verified = TRUE, updated_at = NOW()
           WHERE id = ?`,
          [accountSid, encryptedAuthToken, region, verificationCode, expiresAt, id]
        );
      } else {
        await database.execute(
          `INSERT INTO user_twilio_numbers
           (id, user_id, phone_number, region, provider, verified, verification_code, verification_expires_at, twilio_account_sid, twilio_auth_token, created_at)
           VALUES (?, ?, ?, ?, 'twilio', TRUE, ?, ?, ?, ?, NOW())`,
          [id, userId, phoneNumber, region, verificationCode, expiresAt, accountSid, encryptedAuthToken]
        );
      }

      // Ensure phone_numbers table has the entry (so calls FK works)
      const countryCode = this.extractCountryCodeFromPhoneNumber(phoneNumber);
      const phoneNumberId = uuidv4();
      const capabilities = {
        voice: (twilioNumber.capabilities && twilioNumber.capabilities.voice) || true,
        sms: (twilioNumber.capabilities && twilioNumber.capabilities.sms) || false,
        mms: (twilioNumber.capabilities && twilioNumber.capabilities.mms) || false
      };

      const [existingPhoneRows] = await database.execute(
        'SELECT id FROM phone_numbers WHERE user_id = ? AND phone_number = ?',
        [userId, phoneNumber]
      ).catch(err => { throw new Error(`DB error (phone_numbers select): ${err.message}`); });

      if (!existingPhoneRows || existingPhoneRows.length === 0) {
        await database.execute(
          `INSERT INTO phone_numbers
           (id, user_id, phone_number, country_code, source, region, provider, twilio_sid, capabilities, next_cycle, purchased_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())`,
          [phoneNumberId, userId, phoneNumber, countryCode, 'Connected:twilio', region, 'twilio', twilioNumber.sid, JSON.stringify(capabilities)]
        );
      }

      return { id, verificationCode };
    } catch (err) {
      console.error('Error adding Twilio number:', err);
      throw new Error(`Failed to add Twilio number: ${err.message}`);
    }
  }

  // Add a phone number from user's Twilio account (account already in DB)
  async addPhoneNumberFromAccount(userId, accountSid, phoneNumber, region) {
    try {
      const account = await this.getUserTwilioAccount(userId, accountSid);
      if (!account) {
        throw new Error('Twilio account not found for user');
      }

      const client = this.getClientForUser(account.accountSid, account.authToken);
      const incomingNumbers = await client.incomingPhoneNumbers.list({ phoneNumber });
      if (!incomingNumbers || incomingNumbers.length === 0) {
        throw new Error('Phone number not found in your Twilio account');
      }
      const twilioNumber = incomingNumbers[0];

      const verificationCode = '123456';
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const [existingRows] = await database.execute(
        'SELECT id FROM user_twilio_numbers WHERE user_id = ? AND phone_number = ?',
        [userId, phoneNumber]
      ).catch(err => { throw new Error(`DB error (user_twilio_numbers select): ${err.message}`); });

      const id = (existingRows && existingRows.length > 0) ? existingRows[0].id : uuidv4();
      const encryptedAuthToken = encrypt(account.authToken);

      if (existingRows && existingRows.length > 0) {
        await database.execute(
          `UPDATE user_twilio_numbers 
           SET twilio_account_sid = ?, twilio_auth_token = ?, region = ?, 
               verification_code = ?, verification_expires_at = ?, verified = TRUE, updated_at = NOW()
           WHERE id = ?`,
          [account.accountSid, encryptedAuthToken, region, verificationCode, expiresAt, id]
        );
      } else {
        await database.execute(
          `INSERT INTO user_twilio_numbers
           (id, user_id, phone_number, region, provider, verified, verification_code, verification_expires_at, twilio_account_sid, twilio_auth_token, created_at)
           VALUES (?, ?, ?, ?, 'twilio', TRUE, ?, ?, ?, ?, NOW())`,
          [id, userId, phoneNumber, region, verificationCode, expiresAt, account.accountSid, encryptedAuthToken]
        );
      }

      // Ensure phone_numbers entry exists
      const countryCode = this.extractCountryCodeFromPhoneNumber(phoneNumber);
      const phoneNumberId = uuidv4();
      const capabilities = {
        voice: (twilioNumber.capabilities && twilioNumber.capabilities.voice) || true,
        sms: (twilioNumber.capabilities && twilioNumber.capabilities.sms) || false,
        mms: (twilioNumber.capabilities && twilioNumber.capabilities.mms) || false
      };

      const [existingPhoneRows] = await database.execute(
        'SELECT id FROM phone_numbers WHERE user_id = ? AND phone_number = ?',
        [userId, phoneNumber]
      ).catch(err => { throw new Error(`DB error (phone_numbers select): ${err.message}`); });

      if (!existingPhoneRows || existingPhoneRows.length === 0) {
        await database.execute(
          `INSERT INTO phone_numbers
           (id, user_id, phone_number, country_code, source, region, provider, twilio_sid, capabilities, next_cycle, purchased_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())`,
          [phoneNumberId, userId, phoneNumber, countryCode, 'Connected:twilio', region, 'twilio', twilioNumber.sid, JSON.stringify(capabilities)]
        );
      }

      return { id, verificationCode };
    } catch (err) {
      console.error('Error adding Twilio number from account:', err);
      throw new Error(`Failed to add Twilio number: ${err.message}`);
    }
  }

  extractCountryCodeFromPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') return 'us';
    if (phoneNumber.startsWith('+91')) return 'in';
    if (phoneNumber.startsWith('+44')) return 'gb';
    if (phoneNumber.startsWith('+86')) return 'cn';
    if (phoneNumber.startsWith('+1')) return 'us';
    return 'us';
  }

  async getOrCreateVerifyService(client, accountSid) {
    try {
      const services = await client.verify.v2.services.list({ limit: 1 });
      if (services && services.length > 0) return services[0];
      return await client.verify.v2.services.create({ friendlyName: 'Ziya Voice Agent Verification' });
    } catch (err) {
      console.error('Error getting Verify service:', err);
      throw err;
    }
  }

  // Verify Twilio number with OTP (bypassed for auto-verified numbers)
  async verifyTwilioNumber(userId, phoneNumber, otp) {
    try {
      const [rows] = await database.execute(
        `SELECT id, verification_code, verification_expires_at, twilio_account_sid, twilio_auth_token, verified
         FROM user_twilio_numbers 
         WHERE user_id = ? AND phone_number = ?`,
        [userId, phoneNumber]
      ).catch(err => { throw new Error(`DB error (user_twilio_numbers select): ${err.message}`); });

      if (!rows || rows.length === 0) {
        throw new Error('Phone number not found');
      }

      const number = rows[0];
      if (number.verified) return true;

      const decryptedAuthToken = decrypt(number.twilio_auth_token);

      if (number.verification_code === otp) {
        const expiresAt = new Date(number.verification_expires_at);
        if (expiresAt > new Date()) {
          await database.execute('UPDATE user_twilio_numbers SET verified = TRUE, verification_code = NULL, verification_expires_at = NULL WHERE id = ?', [number.id]);
          return true;
        }
        throw new Error('Verification code has expired');
      }

      try {
        const client = this.getClientForUser(number.twilio_account_sid, decryptedAuthToken);
        const verifyService = await this.getOrCreateVerifyService(client, number.twilio_account_sid);
        const verificationCheck = await client.verify.v2.services(verifyService.sid).verificationChecks.create({
          to: phoneNumber,
          code: otp
        });
        if (verificationCheck && verificationCheck.status === 'approved') {
          await database.execute('UPDATE user_twilio_numbers SET verified = TRUE, verification_code = NULL, verification_expires_at = NULL WHERE id = ?', [number.id]);
          return true;
        }
        throw new Error('Invalid verification code');
      } catch (innerErr) {
        console.error('Twilio Verify API error:', innerErr);
      }

      throw new Error('Invalid verification code');
    } catch (err) {
      console.error('Error verifying Twilio number:', err);
      throw new Error(`Failed to verify number: ${err.message}`);
    }
  }

  async getVerifiedNumbers(userId) {
    try {
      const [rows] = await database.execute(
        `SELECT id, user_id, phone_number, region, provider, verified, twilio_account_sid, twilio_auth_token, created_at
         FROM user_twilio_numbers 
         WHERE user_id = ? AND verified = TRUE
         ORDER BY created_at DESC`,
        [userId]
      ).catch(err => { throw new Error(`DB error (user_twilio_numbers select): ${err.message}`); });

      const safeRows = rows || [];
      return safeRows.map(row => {
        // Decrypt the auth token before returning
        let decryptedAuthToken = row.twilio_auth_token;
        try {
          decryptedAuthToken = decrypt(row.twilio_auth_token);
        } catch (decryptError) {
          console.error('Error decrypting auth token for number:', row.phone_number, decryptError);
        }

        return {
          id: row.id,
          userId: row.user_id,
          phoneNumber: row.phone_number,
          region: row.region,
          provider: row.provider,
          verified: row.verified,
          twilioAccountSid: row.twilio_account_sid,
          twilioAuthToken: decryptedAuthToken,
          createdAt: row.created_at
        };
      });
    } catch (err) {
      console.error('Error fetching verified numbers:', err);
      throw new Error('Failed to fetch verified numbers');
    }
  }

  async getTwilioNumberById(userId, numberId) {
    try {
      const [rows] = await database.execute(
        `SELECT id, user_id, phone_number, region, provider, verified, twilio_account_sid, twilio_auth_token, created_at
         FROM user_twilio_numbers 
         WHERE id = ? AND user_id = ?`,
        [numberId, userId]
      ).catch(err => { throw new Error(`DB error (user_twilio_numbers select by id): ${err.message}`); });

      if (!rows || rows.length === 0) return null;
      const row = rows[0];

      // Decrypt the auth token before returning
      let decryptedAuthToken = row.twilio_auth_token;
      try {
        decryptedAuthToken = decrypt(row.twilio_auth_token);
      } catch (decryptError) {
        console.error('Error decrypting auth token for number:', row.phone_number, decryptError);
      }

      return {
        id: row.id,
        userId: row.user_id,
        phoneNumber: row.phone_number,
        region: row.region,
        provider: row.provider,
        verified: row.verified,
        twilioAccountSid: row.twilio_account_sid,
        twilioAuthToken: decryptedAuthToken,
        createdAt: row.created_at
      };
    } catch (err) {
      console.error('Error fetching Twilio number:', err);
      throw new Error('Failed to fetch Twilio number');
    }
  }

  // ========== CRITICAL FIX: Updated webhook URLs ==========
  async createCall(params) {
    try {
      const twilioNumber = await this.getTwilioNumberById(params.userId, params.twilioNumberId);
      if (!twilioNumber) throw new Error('Twilio number not found');
      if (!twilioNumber.verified) throw new Error('Twilio number is not verified');

      const client = this.getClientForUser(twilioNumber.twilioAccountSid, twilioNumber.twilioAuthToken);

      // ✅ Ensure appUrl has protocol (add https:// if missing)
      let appUrl = params.appUrl;
      if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
        appUrl = `https://${appUrl}`;
        console.log(`⚠️ Added https:// protocol to APP_URL: ${appUrl}`);
      }

      // ✅ FIXED: Use correct webhook URLs that match server.js endpoints
      const voiceUrl = `${appUrl}/api/twilio/voice?userId=${params.userId}&agentId=${params.agentId}&callId=${params.callId}`;
      const statusCallback = `${appUrl}/api/twilio/callback?userId=${params.userId}&callId=${params.callId}`;

      console.log('🔗 Creating Twilio call with webhooks:');
      console.log('   Voice URL:', voiceUrl);
      console.log('   Status Callback:', statusCallback);

      const call = await client.calls.create({
        to: params.to,
        from: twilioNumber.phoneNumber,
        url: voiceUrl,
        statusCallback: statusCallback,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
        statusCallbackMethod: 'POST',
        record: false // Set to true if you want call recording
      });

      console.log('✅ Twilio call created:', call.sid);
      return call;
    } catch (err) {
      console.error('❌ Error creating Twilio call:', err);
      throw new Error(`Failed to create call: ${err.message}`);
    }
  }

  async getUserTwilioAccounts(userId) {
    try {
      const [rows] = await database.execute(
        'SELECT id, name, account_sid, auth_token FROM user_twilio_accounts WHERE user_id = ?',
        [userId]
      ).catch(err => { throw new Error(`DB error (user_twilio_accounts select): ${err.message}`); });

      const safeRows = rows || [];
      return safeRows.map(row => ({
        id: row.id,
        name: row.name,
        accountSid: row.account_sid,
        authToken: row.auth_token
      }));
    } catch (err) {
      console.error('Error fetching user Twilio accounts:', err);
      throw new Error('Failed to fetch user Twilio accounts');
    }
  }

  async getUserTwilioAccount(userId, accountSid) {
    try {
      const [rows] = await database.execute(
        'SELECT id, name, account_sid, auth_token FROM user_twilio_accounts WHERE user_id = ? AND account_sid = ?',
        [userId, accountSid]
      ).catch(err => { throw new Error(`DB error (user_twilio_accounts select single): ${err.message}`); });

      if (!rows || rows.length === 0) return null;
      return {
        id: rows[0].id,
        name: rows[0].name,
        accountSid: rows[0].account_sid,
        authToken: rows[0].auth_token
      };
    } catch (err) {
      console.error('Error fetching user Twilio account:', err);
      throw new Error('Failed to fetch user Twilio account');
    }
  }

  async fetchPhoneNumbersFromUserAccount(userId, accountSid) {
    try {
      const account = await this.getUserTwilioAccount(userId, accountSid);
      if (!account) throw new Error('Twilio account not found for user');

      const client = this.getClientForUser(account.accountSid, account.authToken);
      const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 100 });

      return (incomingNumbers || []).map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        sid: num.sid,
        capabilities: {
          voice: (num.capabilities && num.capabilities.voice) || false,
          sms: (num.capabilities && num.capabilities.sms) || false,
          mms: (num.capabilities && num.capabilities.mms) || false
        }
      }));
    } catch (err) {
      console.error('Error fetching phone numbers from user account:', err);
      throw new Error(`Failed to fetch phone numbers: ${err.message}`);
    }
  }
}

module.exports = TwilioService;
