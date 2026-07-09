/**
 * Country list for the origin/roastery fields. Codes are ISO 3166-1 alpha-2;
 * the flag emoji is derived from the code. Names are what we store (matching
 * existing data like "Brazil"). Coffee-producing countries come first-class,
 * alongside common roaster/home countries.
 */
export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: "BR", name: "Brazil" },
  { code: "CO", name: "Colombia" },
  { code: "ET", name: "Ethiopia" },
  { code: "KE", name: "Kenya" },
  { code: "GT", name: "Guatemala" },
  { code: "CR", name: "Costa Rica" },
  { code: "HN", name: "Honduras" },
  { code: "SV", name: "El Salvador" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panama" },
  { code: "PE", name: "Peru" },
  { code: "BO", name: "Bolivia" },
  { code: "EC", name: "Ecuador" },
  { code: "MX", name: "Mexico" },
  { code: "RW", name: "Rwanda" },
  { code: "BI", name: "Burundi" },
  { code: "TZ", name: "Tanzania" },
  { code: "UG", name: "Uganda" },
  { code: "CD", name: "DR Congo" },
  { code: "YE", name: "Yemen" },
  { code: "ID", name: "Indonesia" },
  { code: "IN", name: "India" },
  { code: "VN", name: "Vietnam" },
  { code: "CN", name: "China" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "JM", name: "Jamaica" },
  { code: "CU", name: "Cuba" },
  { code: "DO", name: "Dominican Republic" },
  { code: "VE", name: "Venezuela" },
  { code: "MW", name: "Malawi" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "TH", name: "Thailand" },
  { code: "MM", name: "Myanmar" },
  { code: "LA", name: "Laos" },
  { code: "PH", name: "Philippines" },
  { code: "TL", name: "Timor-Leste" },
  { code: "HT", name: "Haiti" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
  { code: "IS", name: "Iceland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "GR", name: "Greece" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
  { code: "SG", name: "Singapore" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "UY", name: "Uruguay" },
  { code: "ZA", name: "South Africa" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "TR", name: "Turkey" },
];

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code. */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

/** Flag for a stored country name (empty string if unknown). */
export function flagForName(name: string | null): string {
  if (!name) return "";
  return flagEmoji(BY_NAME.get(name.toLowerCase())?.code ?? "");
}
