import dns from "dns/promises";
// @ts-ignore
import ipaddr from "ipaddr.js";

/**
 * Validates a URL against Server-Side Request Forgery (SSRF) attacks.
 * Blocks loopback, private RFC1918, and cloud metadata IP ranges.
 */
export async function isSafeUrl(urlStr: string): Promise<boolean> {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    let ips: string[] = [];
    if (ipaddr.isValid(parsed.hostname)) {
      ips = [parsed.hostname];
    } else {
      const records = await dns.lookup(parsed.hostname, { all: true });
      ips = records.map((r) => r.address);
    }

    if (ips.length === 0) return false;

    for (const ipStr of ips) {
      if (!ipaddr.isValid(ipStr)) return false;
      const ip = ipaddr.parse(ipStr);
      const range = ip.range();
      if (
        range === "loopback" ||
        range === "private" ||
        range === "uniqueLocal" ||
        range === "linkLocal" ||
        ipStr === "169.254.169.254" // EC2 metadata
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
