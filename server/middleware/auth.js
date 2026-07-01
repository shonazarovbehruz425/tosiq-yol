import crypto from 'crypto';

/**
 * Validates initData sent by Telegram Web App.
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function verifyTelegramWebAppData(initData, botToken) {
  if (!botToken || botToken.startsWith('YOUR_TELEGRAM_BOT_TOKEN') || !initData) {
    // Development bypass if token is omitted, placeholder, or if running directly in a browser
    const randomId = 123456700 + Math.floor(Math.random() * 1000);
    console.warn(`verifyTelegramWebAppData: Development bypass active. Mock User ID: ${randomId}`);
    return {
      isValid: true,
      user: {
        id: randomId,
        first_name: `DevLocal_${randomId % 100}`,
        username: `dev_local_${randomId % 100}`
      }
    };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) return { isValid: false, reason: 'Hash missing' };

    // Sort parameters alphabetically
    const dataKeys = [];
    for (const [key, value] of params.entries()) {
      if (key !== 'hash') {
        dataKeys.push(`${key}=${value}`);
      }
    }
    dataKeys.sort();
    const dataCheckString = dataKeys.join('\n');

    // 1. Secret key is HMAC-SHA256 of botToken with key "WebAppData"
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 2. Hash dataCheckString with secretKey
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // 3. Verify signature matches
    if (calculatedHash !== hash) {
      return { isValid: false, reason: 'Signature mismatch' };
    }

    // 4. Expiry validation (e.g., within 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return { isValid: false, reason: 'Session expired' };
    }

    // Parse user object
    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : null;

    return { isValid: true, user };
  } catch (err) {
    return { isValid: false, reason: `Validation error: ${err.message}` };
  }
}

// Express HTTP Middleware helper
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Auth header missing' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <initData>
  const BOT_TOKEN = process.env.BOT_TOKEN;

  const result = verifyTelegramWebAppData(token, BOT_TOKEN);
  if (!result.isValid) {
    return res.status(403).json({ error: result.reason || 'Forbidden' });
  }

  req.tgUser = result.user;
  next();
};
