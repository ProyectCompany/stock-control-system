// Play audio beep when barcode is successfully scanned
export const playBeepSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 pitch
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // AudioContext might be blocked until user gesture, ignore silently
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
  if (!clean || clean.length < 4) return false;

  // Numeric barcodes (EAN-13, EAN-8, UPC-A, etc.)
  if (/^\d+$/.test(clean)) {
    if (clean.length === 13) return isValidEAN13(clean);
    if (clean.length === 8) return isValidEAN8(clean);
    if (clean.length === 12) return isValidUPCA(clean);
    // Standard valid length for custom numeric barcodes
    return clean.length >= 6 && clean.length <= 16;
  }

  // Alphanumeric barcodes (Code 128, Code 39, QR)
  return clean.length >= 4 && clean.length <= 64;
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
