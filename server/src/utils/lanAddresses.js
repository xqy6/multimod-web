import { networkInterfaces } from "node:os";

function isPrivate(ip) {
  const parts = ip.split(".").map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

export function getLanAddresses() {
  const all = [];
  for (const items of Object.values(networkInterfaces())) {
    for (const item of items ?? []) {
      if (item.family === "IPv4" && !item.internal) {
        all.push(item.address);
      }
    }
  }
  const privateAddresses = all.filter(isPrivate);
  if (privateAddresses.length > 0) {
    return { addresses: privateAddresses, isFallback: false };
  }
  if (all.length > 0) {
    return { addresses: all, isFallback: false };
  }
  return { addresses: ["127.0.0.1"], isFallback: true };
}
