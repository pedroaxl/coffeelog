/**
 * Countries for the origin/roastery fields. We store the display name (matching
 * existing data like "Brazil"). Names come from Intl.DisplayNames and the flag
 * emoji is derived from the ISO 3166-1 alpha-2 code, so the list stays compact.
 *
 * The picker shows a short "Frequent" group (coffee origins + common roaster
 * countries) first, then every country sorted alphabetically.
 */
export interface Country {
  code: string;
  name: string;
}

/** Coffee-producing + common roaster/home countries, shown at the top. */
const FREQUENT_CODES = [
  "BR", "CO", "ET", "KE", "GT", "CR", "HN", "SV", "NI", "PA", "PE", "BO", "EC",
  "MX", "RW", "BI", "TZ", "UG", "YE", "ID", "IN", "VN", "PG", "PT", "IT", "ES",
  "FR", "DE", "GB", "NL", "US", "CA", "AU", "JP",
];

/** Comprehensive ISO 3166-1 alpha-2 list (sovereign states + common regions). */
const ALL_CODES = [
  "AD","AE","AF","AG","AL","AM","AO","AR","AT","AU","AZ","BA","BB","BD","BE","BF",
  "BG","BH","BI","BJ","BN","BO","BR","BS","BT","BW","BY","BZ","CA","CD","CF","CG",
  "CH","CI","CL","CM","CN","CO","CR","CU","CV","CY","CZ","DE","DJ","DK","DM","DO",
  "DZ","EC","EE","EG","ER","ES","ET","FI","FJ","FR","GA","GB","GD","GE","GH","GM",
  "GN","GQ","GR","GT","GW","GY","HK","HN","HR","HT","HU","ID","IE","IL","IN","IQ",
  "IR","IS","IT","JM","JO","JP","KE","KG","KH","KI","KM","KR","KW","KZ","LA","LB",
  "LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MG","MK","ML",
  "MM","MN","MR","MT","MU","MV","MW","MX","MY","MZ","NA","NE","NG","NI","NL","NO",
  "NP","NZ","OM","PA","PE","PG","PH","PK","PL","PR","PT","PY","QA","RO","RS","RU",
  "RW","SA","SB","SC","SD","SE","SG","SI","SK","SL","SM","SN","SO","SR","SS","ST",
  "SV","SY","SZ","TD","TG","TH","TJ","TL","TM","TN","TO","TR","TT","TW","TZ","UA",
  "UG","US","UY","UZ","VC","VE","VN","VU","WS","YE","ZA","ZM","ZW",
];

const REGION_NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function nameFor(code: string): string {
  try {
    return REGION_NAMES?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code. */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export const FREQUENT_COUNTRIES: Country[] = FREQUENT_CODES.map((code) => ({
  code,
  name: nameFor(code),
}));

export const ALL_COUNTRIES: Country[] = ALL_CODES.map((code) => ({ code, name: nameFor(code) })).sort(
  (a, b) => a.name.localeCompare(b.name)
);

const KNOWN_NAMES = new Set(ALL_COUNTRIES.map((c) => c.name));
export function isKnownCountry(name: string): boolean {
  return KNOWN_NAMES.has(name);
}

const CODE_BY_NAME = new Map(ALL_COUNTRIES.map((c) => [c.name.toLowerCase(), c.code]));
/** Flag for a stored country name (empty string if unknown). */
export function flagForName(name: string | null): string {
  if (!name) return "";
  return flagEmoji(CODE_BY_NAME.get(name.toLowerCase()) ?? "");
}
