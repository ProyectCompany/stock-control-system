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

// Generate random EAN-13 style numeric barcode string
export const generateRandomBarcode = (): string => {
  let result = '779'; // Argentina prefix or standard
  for (let i = 0; i < 9; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  // Compute EAN-13 checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(result[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return result + checksum.toString();
};
