/**
 * Generates a cryptographically random meeting code.
 * Uses crypto.randomUUID() for better entropy than Math.random().
 * Result: 8 uppercase hex chars = ~4.3 billion possibilities (vs ~2B before).
 */
export const generateMeetingCode = () => {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};
