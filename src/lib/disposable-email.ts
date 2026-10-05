/**
 * THROWAWAY EMAIL ADDRESSES (temporary inboxes that expire in minutes or
 * hours). Someone signing up with one can still use free Work-ly, but they
 * don't get the one-day Pro trial: otherwise a new throwaway address every
 * day is a free Pro account every day, paid for in AI calls.
 *
 * Deliberately NOT on this list: privacy relays that forward to a real,
 * lasting inbox (Apple Hide My Email, Firefox Relay, DuckDuckGo, SimpleLogin,
 * addy.io, 33mail). Those are real people protecting their address.
 *
 * Pure and dependency-free so it can be tested and used anywhere.
 */

const DOMAINS = new Set(
  `
inboxfast.space
mailinator.com mailinator.net mailinator2.com
guerrillamail.com guerrillamail.net guerrillamail.org guerrillamail.biz guerrillamail.de guerrillamailblock.com
sharklasers.com grr.la pokemail.net spam4.me
10minutemail.com 10minutemail.net 10minutemail.co.uk 20minutemail.it minuteinbox.com
temp-mail.org temp-mail.io tempmail.com tempmail.net tempmail.dev tempmailo.com tempm.com tempail.com
tmpmail.org tmpmail.net tmail.ws tmpeml.com tmails.net tempmailaddress.com tempmailer.com tempmailin.com
tempinbox.com tempr.email mytemp.email
yopmail.com yopmail.net yopmail.fr cool.fr.nf jetable.org
trashmail.com trashmail.net trashmail.de trash-mail.com
mailnesia.com maildrop.cc mailcatch.com dispostable.com discard.email discardmail.com
getnada.com nada.email throwawaymail.com fakeinbox.com fakemail.net emailfake.com
mohmal.com emailondeck.com mintemail.com spamgourmet.com mailpoof.com burnermail.io moakt.com
mail.tm mail.gw
1secmail.com 1secmail.net 1secmail.org esiix.com wwjmp.com xojxe.com yoggm.com kzccv.com qiott.com dcctb.com
mailto.plus fexpost.com fexbox.org fextemp.com any.pink merepost.com rover.info chitthi.in
dropmail.me 10mail.org emltmp.com yomail.info spymail.one
inboxkitten.com mailsac.com harakirimail.com crazymailing.com mailforspam.com spambox.us
owlymail.com eyepaste.com nowmymail.com inboxbear.com mail7.io vomoto.com luxusmail.org
linshiyouxiang.net emailtemporanea.net
`
    .split(/\s+/)
    .filter(Boolean),
);

/** Words that only temporary-inbox services put in their domain names. */
const TELLTALE = [
  "tempmail",
  "temp-mail",
  "tmpmail",
  "mailtemp",
  "tempinbox",
  "throwaway",
  "disposable",
  "minutemail",
  "minuteinbox",
  "guerrillamail",
  "mailinator",
  "yopmail",
  "trashmail",
  "fakeinbox",
  "fakemail",
  "burnermail",
  "spambox",
];

/** The domain part of an address, lower-cased, or null if it isn't one. */
export function emailDomain(email: string | null | undefined): string | null {
  const at = email?.trim().toLowerCase().lastIndexOf("@") ?? -1;
  if (!email || at < 1) return null;
  const domain = email.trim().toLowerCase().slice(at + 1).replace(/\.$/, "");
  return domain.includes(".") ? domain : null;
}

/** True for an address at a known temporary-inbox service (or a subdomain of one). */
export function isDisposableEmail(email: string | null | undefined): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  const name = parts.slice(0, -1).join(".");
  return TELLTALE.some((word) => name.includes(word));
}
