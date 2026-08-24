import "server-only";
import { lookup as dnsLookup } from "node:dns/promises";
import { Agent } from "undici";

/**
 * Blocks server-side requests from reaching anywhere on the private network.
 *
 * Two places in this app fetch a URL the USER supplies (a job posting page,
 * a discovery source feed): checking only the protocol (http/https) is not
 * enough, because "a valid https URL" and "a URL that resolves to your cloud
 * metadata endpoint or an internal service" are the same shape. Without this,
 * pasting a job URL of `http://169.254.169.254/latest/meta-data/` or
 * `http://localhost:5432/` fetches whatever is actually listening there and
 * hands the response text straight back to the user as a "job description".
 *
 * This guards two separate moments, because a check at only one of them is
 * not a guarantee:
 *
 *   1. Before the first request: resolve the hostname and reject it if any
 *      resolved address is private/loopback/link-local/reserved.
 *   2. On every redirect: a URL that starts out pointing at a legitimate
 *      public host can 302 to an internal one server-side, so `redirect:
 *      "follow"` cannot be trusted blindly - each hop gets the same check.
 *
 * The resolved IP is also pinned into the actual TCP connection (via
 * undici's `connect.lookup`), not just checked and then handed back to a
 * normal fetch that re-resolves the hostname itself - otherwise a DNS
 * answer that changes between the check and the connect (a classic
 * TOCTOU/rebinding attack) slips straight past the check.
 */

const MAX_REDIRECTS = 5;

export class BlockedUrlError extends Error {
  constructor(message = "That URL points somewhere this app won't fetch.") {
    super(message);
    this.name = "BlockedUrlError";
  }
}

function ipv4Blocked(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8 - "this network"
  if (a === 10) return true; // 10.0.0.0/8 - private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 - CGNAT
  if (a === 127) return true; // 127.0.0.0/8 - loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 - link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 - private
  if (a === 192 && b === 0 && octets[2] === 0) return true; // 192.0.0.0/24 - IETF protocol assignments
  if (a === 192 && b === 0 && octets[2] === 2) return true; // 192.0.2.0/24 - TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 - private
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 - benchmarking
  if (a === 198 && b === 51 && octets[2] === 100) return true; // 198.51.100.0/24 - TEST-NET-2
  if (a === 203 && b === 0 && octets[2] === 113) return true; // 203.0.113.0/24 - TEST-NET-3
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + broadcast
  return false;
}

function parseIpv4(text: string): number[] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return octets;
}

/** True when `address` (as returned by dns.lookup, family 4 or 6) must not be fetched. */
export function isBlockedAddress(address: string, family: 4 | 6): boolean {
  if (family === 4) {
    const octets = parseIpv4(address);
    return octets ? ipv4Blocked(octets) : true; // unparseable -> fail closed
  }

  const lower = address.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified

  // IPv4-mapped (::ffff:a.b.c.d) and the well-known NAT64 prefix both carry a
  // real IPv4 address in their low bits - unwrap and re-check that, or a
  // blocked v4 address slips through wrapped in v6 syntax.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/) ?? lower.match(/^64:ff9b::(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    const octets = parseIpv4(mapped[1]);
    return octets ? ipv4Blocked(octets) : true;
  }

  const firstGroup = parseInt(lower.split(":")[0] || "0", 16);
  if ((firstGroup & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if ((firstGroup & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((firstGroup & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

/** Resolves every address a hostname maps to and rejects if any is blocked. */
async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  let results: { address: string; family: number }[];
  try {
    results = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new BlockedUrlError("Couldn't resolve that URL's host.");
  }
  if (results.length === 0) throw new BlockedUrlError("Couldn't resolve that URL's host.");

  for (const { address, family } of results) {
    if (isBlockedAddress(address, family === 6 ? 6 : 4)) {
      throw new BlockedUrlError();
    }
  }
  // Pin to the first resolved address so the eventual TCP connection cannot
  // land on a *different* address than the one just checked.
  return { address: results[0].address, family: results[0].family === 6 ? 6 : 4 };
}

/**
 * A fetch that only ever talks to public addresses, checked and pinned fresh
 * on every hop of a redirect chain. Drop-in shape for the two callers that
 * need it, not a general-purpose fetch replacement.
 */
export async function guardedFetch(
  initialUrl: string,
  init: { method?: string; headers?: Record<string, string>; signal?: AbortSignal },
): Promise<Response> {
  let current = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new BlockedUrlError("Only http(s) URLs are supported.");
    }

    const { address, family } = await resolvePublicAddress(parsed.hostname);

    const dispatcher = new Agent({
      connect: {
        // Force this connection to the exact address just validated, rather
        // than letting the socket layer re-resolve the hostname itself (the
        // gap that lets a DNS answer change between the check above and the
        // actual connect - "DNS rebinding").
        //
        // autoSelectFamily defaults to true on modern Node, which makes
        // net.connect take its Happy Eyeballs path and call `lookup` with
        // `{ all: true }`, expecting `callback(err, addresses[])` instead of
        // the classic `callback(err, address, family)` - passing a single
        // address there throws ERR_INVALID_IP_ADDRESS. There's only ever
        // one address to offer here anyway (the one already validated), so
        // turning autoSelectFamily off is the correct fix, not just a
        // workaround: it puts net.connect back on the single-address path
        // this `lookup` is actually written for.
        autoSelectFamily: false,
        lookup: (_hostname, _options, callback) => {
          callback(null, address, family);
        },
      },
    });

    // Node's global `fetch` IS undici under the hood and accepts the same
    // extended options (`dispatcher` included) - calling it here rather
    // than importing `fetch` from the `undici` package directly matters
    // for more than style: tests (and anything else in this codebase that
    // stubs `globalThis.fetch`) can only intercept calls that actually go
    // through the global. A direct undici import would silently bypass
    // that and hit the real network in tests.
    const response = await fetch(parsed.toString(), {
      method: init.method ?? "GET",
      headers: init.headers,
      signal: init.signal,
      redirect: "manual",
      // @ts-expect-error -- `dispatcher` is a real, documented Node fetch
      // extension (undici's own dispatcher option) that the DOM lib types
      // fetch() against don't know about.
      dispatcher,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      // A redirect response has nothing this app wants to read; drain it so
      // the socket returns to the pool/closes cleanly, then check the next
      // hop's address before this (now-discarded) agent goes out of scope.
      await response.body?.cancel().catch(() => {});
      void dispatcher.close();
      if (!location) return response;
      current = new URL(location, parsed).toString();
      continue;
    }

    // This is the response the caller actually wants to read. Its body is a
    // stream backed by this dispatcher's socket, and reading happens after
    // this function returns - closing the dispatcher here, even "gracefully",
    // risks tearing down that stream out from under the caller. Leave it to
    // undici's own idle-connection timeout instead of closing it by hand.
    return response;
  }

  throw new BlockedUrlError("Too many redirects.");
}
