// services/jwtBlacklistService.js

const blacklist = new Map();

// Revoke a token by its jti on logout.
const blacklistToken = (jti, expTimestamp) => {
  blacklist.set(jti, expTimestamp * 1000);
  console.log(`[tokenBlacklist] Revoked jti=${jti} expires=${new Date(expTimestamp * 1000).toISOString()}`);
};


// Returns true if token has been revoked.
const isBlacklisted = (jti) => {
  if (!jti) return false;
  return blacklist.has(jti);
};

// Remove entry when tokens have already expired.
const purgeExpired = () => {
  const now = Date.now();
  let removed = 0;
  for (const [jti, expiresAtMs] of blacklist.entries()) {
    if (now > expiresAtMs) {
      blacklist.delete(jti);
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`[tokenBlacklist] Purged ${removed} expired entries. Active: ${blacklist.size}`);
  }
};

// Run cleanup every 15 min
const timer = setInterval(purgeExpired, 15 * 60 * 1000);
timer.unref();

const getStats = () => ({ revokedTokens: blacklist.size });

module.exports = { blacklistToken, isBlacklisted, purgeExpired, getStats };