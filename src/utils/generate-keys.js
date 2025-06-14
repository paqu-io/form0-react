export function generateKey(dataName) {
    // Browser-friendly version: mimic the structure used in form0-core
    const text = dataName + Date.now();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36).slice(0, 5);
}