import { NATIVE_LANG } from "./config";

export interface Language {
  code: string;
  name: string;
  flag: string;
  region?: string;
}

/** Listener's choice for "no translation, hear everyone natively." */
export const NATIVE_OPTION: Language = {
  code: NATIVE_LANG,
  name: "None — Native",
  flag: "👂",
};

/**
 * All 76 languages officially supported by the Gemini Live Translate API
 * (gemini-3.5-live-translate-preview) as documented at:
 * https://ai.google.dev/gemini-api/docs/live-api/live-translate
 *
 * BCP-47 codes match exactly what the API's translationConfig.targetLanguageCode expects.
 * Original app had 16 languages — now fully expanded to the complete supported set.
 */
export const SUPPORTED_LANGUAGES: Language[] = [
  // ── Major World Languages ───────────────────────────────────────────
  { code: "en",      name: "English",                flag: "🇺🇸", region: "Global" },
  { code: "es",      name: "Spanish",                flag: "🇪🇸", region: "Global" },
  { code: "fr",      name: "French",                 flag: "🇫🇷", region: "Global" },
  { code: "de",      name: "German",                 flag: "🇩🇪", region: "Europe" },
  { code: "it",      name: "Italian",                flag: "🇮🇹", region: "Europe" },
  { code: "pt-BR",   name: "Portuguese (Brazil)",    flag: "🇧🇷", region: "Americas" },
  { code: "pt-PT",   name: "Portuguese (Portugal)",  flag: "🇵🇹", region: "Europe" },
  { code: "ru",      name: "Russian",                flag: "🇷🇺", region: "Europe" },
  { code: "zh-Hans", name: "Chinese (Simplified)",   flag: "🇨🇳", region: "Asia" },
  { code: "zh-Hant", name: "Chinese (Traditional)",  flag: "🇹🇼", region: "Asia" },
  { code: "ja",      name: "Japanese",               flag: "🇯🇵", region: "Asia" },
  { code: "ko",      name: "Korean",                 flag: "🇰🇷", region: "Asia" },
  { code: "ar",      name: "Arabic",                 flag: "🇸🇦", region: "Middle East" },
  { code: "hi",      name: "Hindi",                  flag: "🇮🇳", region: "South Asia" },

  // ── European Languages ──────────────────────────────────────────────
  { code: "af",      name: "Afrikaans",              flag: "🇿🇦", region: "Africa" },
  { code: "sq",      name: "Albanian",               flag: "🇦🇱", region: "Europe" },
  { code: "hy",      name: "Armenian",               flag: "🇦🇲", region: "Europe" },
  { code: "az",      name: "Azerbaijani",            flag: "🇦🇿", region: "Central Asia" },
  { code: "eu",      name: "Basque",                 flag: "🏴",  region: "Europe" },
  { code: "be",      name: "Belarusian",             flag: "🇧🇾", region: "Europe" },
  { code: "bg",      name: "Bulgarian",              flag: "🇧🇬", region: "Europe" },
  { code: "ca",      name: "Catalan",                flag: "🏴",  region: "Europe" },
  { code: "hr",      name: "Croatian",               flag: "🇭🇷", region: "Europe" },
  { code: "cs",      name: "Czech",                  flag: "🇨🇿", region: "Europe" },
  { code: "da",      name: "Danish",                 flag: "🇩🇰", region: "Europe" },
  { code: "nl",      name: "Dutch",                  flag: "🇳🇱", region: "Europe" },
  { code: "et",      name: "Estonian",               flag: "🇪🇪", region: "Europe" },
  { code: "fi",      name: "Finnish",                flag: "🇫🇮", region: "Europe" },
  { code: "gl",      name: "Galician",               flag: "🏴",  region: "Europe" },
  { code: "ka",      name: "Georgian",               flag: "🇬🇪", region: "Europe" },
  { code: "el",      name: "Greek",                  flag: "🇬🇷", region: "Europe" },
  { code: "hu",      name: "Hungarian",              flag: "🇭🇺", region: "Europe" },
  { code: "is",      name: "Icelandic",              flag: "🇮🇸", region: "Europe" },
  { code: "lv",      name: "Latvian",                flag: "🇱🇻", region: "Europe" },
  { code: "lt",      name: "Lithuanian",             flag: "🇱🇹", region: "Europe" },
  { code: "mk",      name: "Macedonian",             flag: "🇲🇰", region: "Europe" },
  { code: "nb",      name: "Norwegian",              flag: "🇳🇴", region: "Europe" },
  { code: "pl",      name: "Polish",                 flag: "🇵🇱", region: "Europe" },
  { code: "ro",      name: "Romanian",               flag: "🇷🇴", region: "Europe" },
  { code: "sr",      name: "Serbian",                flag: "🇷🇸", region: "Europe" },
  { code: "sk",      name: "Slovak",                 flag: "🇸🇰", region: "Europe" },
  { code: "sl",      name: "Slovenian",              flag: "🇸🇮", region: "Europe" },
  { code: "sv",      name: "Swedish",                flag: "🇸🇪", region: "Europe" },
  { code: "uk",      name: "Ukrainian",              flag: "🇺🇦", region: "Europe" },

  // ── Asian Languages ─────────────────────────────────────────────────
  { code: "id",      name: "Indonesian",             flag: "🇮🇩", region: "Asia" },
  { code: "jv",      name: "Javanese",               flag: "🇮🇩", region: "Asia" },
  { code: "km",      name: "Khmer",                  flag: "🇰🇭", region: "Asia" },
  { code: "lo",      name: "Lao",                    flag: "🇱🇦", region: "Asia" },
  { code: "ms",      name: "Malay",                  flag: "🇲🇾", region: "Asia" },
  { code: "mn",      name: "Mongolian",              flag: "🇲🇳", region: "Asia" },
  { code: "my",      name: "Burmese (Myanmar)",      flag: "🇲🇲", region: "Asia" },
  { code: "su",      name: "Sundanese",              flag: "🇮🇩", region: "Asia" },
  { code: "th",      name: "Thai",                   flag: "🇹🇭", region: "Asia" },
  { code: "vi",      name: "Vietnamese",             flag: "🇻🇳", region: "Asia" },

  // ── South Asian Languages ───────────────────────────────────────────
  { code: "bn",      name: "Bengali",                flag: "🇧🇩", region: "South Asia" },
  { code: "gu",      name: "Gujarati",               flag: "🇮🇳", region: "South Asia" },
  { code: "kn",      name: "Kannada",                flag: "🇮🇳", region: "South Asia" },
  { code: "ml",      name: "Malayalam",              flag: "🇮🇳", region: "South Asia" },
  { code: "mr",      name: "Marathi",                flag: "🇮🇳", region: "South Asia" },
  { code: "ne",      name: "Nepali",                 flag: "🇳🇵", region: "South Asia" },
  { code: "pa",      name: "Punjabi",                flag: "🇮🇳", region: "South Asia" },
  { code: "sd",      name: "Sindhi",                 flag: "🇵🇰", region: "South Asia" },
  { code: "si",      name: "Sinhala",                flag: "🇱🇰", region: "South Asia" },
  { code: "ta",      name: "Tamil",                  flag: "🇮🇳", region: "South Asia" },
  { code: "te",      name: "Telugu",                 flag: "🇮🇳", region: "South Asia" },
  { code: "ur",      name: "Urdu",                   flag: "🇵🇰", region: "South Asia" },

  // ── Middle East & Central Asia ──────────────────────────────────────
  { code: "fa",      name: "Persian (Farsi)",        flag: "🇮🇷", region: "Middle East" },
  { code: "he",      name: "Hebrew",                 flag: "🇮🇱", region: "Middle East" },
  { code: "tr",      name: "Turkish",                flag: "🇹🇷", region: "Middle East" },
  { code: "kk",      name: "Kazakh",                 flag: "🇰🇿", region: "Central Asia" },
  { code: "uz",      name: "Uzbek",                  flag: "🇺🇿", region: "Central Asia" },
  { code: "fil",     name: "Filipino",               flag: "🇵🇭", region: "Asia" },

  // ── African Languages ───────────────────────────────────────────────
  { code: "ak",      name: "Akan",                   flag: "🇬🇭", region: "Africa" },
  { code: "am",      name: "Amharic",                flag: "🇪🇹", region: "Africa" },
  { code: "ha",      name: "Hausa",                  flag: "🇳🇬", region: "Africa" },
  { code: "rw",      name: "Kinyarwanda",            flag: "🇷🇼", region: "Africa" },
  { code: "sw",      name: "Swahili",                flag: "🇰🇪", region: "Africa" },
  { code: "zu",      name: "Zulu",                   flag: "🇿🇦", region: "Africa" },
];

/** Options shown in the pre-flight language picker. */
export const PICKER_LANGUAGES: Language[] = [...SUPPORTED_LANGUAGES, NATIVE_OPTION];

export function getLanguageByCode(code: string): Language | undefined {
  if (code === NATIVE_OPTION.code) return NATIVE_OPTION;
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/** Group languages by region for a better picker UX */
export function getLanguagesByRegion(): Map<string, Language[]> {
  const map = new Map<string, Language[]>();
  for (const lang of SUPPORTED_LANGUAGES) {
    const region = lang.region ?? "Other";
    if (!map.has(region)) map.set(region, []);
    map.get(region)!.push(lang);
  }
  return map;
}
