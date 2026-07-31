// Play audio beep and trigger haptic vibration when barcode is successfully scanned
export const playBeepSound = () => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(120);
    }
  } catch (e) {
    // Ignore vibration errors on non-mobile devices
  }

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn("Audio play blocked", e);
  }
};

// Checksum verification for EAN-13
export const isValidEAN13 = (code: string): boolean => {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(code[12], 10);
};

// Checksum verification for EAN-8
export const isValidEAN8 = (code: string): boolean => {
  if (!/^\d{8}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(code[7], 10);
};

// Checksum verification for UPC-A
export const isValidUPCA = (code: string): boolean => {
  if (!/^\d{12}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(code[11], 10);
};

// Comprehensive Barcode Format & Integrity Validator
export const validateBarcodeFormat = (code: string): boolean => {
  const clean = code.trim();
  if (!clean || clean.length < 3 || clean.length > 64) return false;

  // If 13 digits, verify EAN-13 checksum
  if (clean.length === 13 && /^\d{13}$/.test(clean)) {
    return isValidEAN13(clean);
  }
  // If 8 digits, verify EAN-8 checksum
  if (clean.length === 8 && /^\d{8}$/.test(clean)) {
    return isValidEAN8(clean);
  }
  // If 12 digits, verify UPC-A checksum
  if (clean.length === 12 && /^\d{12}$/.test(clean)) {
    return isValidUPCA(clean);
  }

  // General valid barcode format (Code 128, Code 39, ITF, QR, custom codes)
  return clean.length >= 3 && clean.length <= 64;
};

// Generate random EAN-13 style numeric barcode string
export const generateRandomBarcode = (): string => {
  let result = '779'; // Argentina prefix or standard
  for (let i = 0; i < 9; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(result[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return result + checksum.toString();
};
