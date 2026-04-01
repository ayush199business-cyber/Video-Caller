export const generateMeetingCode = () => {
  // Generate a 6-character alphanumeric code
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};
