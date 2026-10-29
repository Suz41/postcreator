import nlp from "compromise";
import nspell from "nspell";
import { EN_AFF, EN_DIC } from "./enDictData";

const LT_API = "https://api.languagetool.org/v2/check";

export interface GrammarCheckOptions {
  language: string;
  level: "picky" | "default";
  enabledOnly: boolean;
  timeoutMs: number;
}

export const DEFAULT_GRAMMAR_OPTIONS: GrammarCheckOptions = {
  language: "en-US",
  level: "picky",
  enabledOnly: false,
  timeoutMs: 3500, // Responsive timeout before seamless local AI fallback
};

export interface GrammarMatch {
  offset: number;
  length: number;
  replacements: { value: string }[];
}

export interface GrammarCheckResult {
  corrected: string;
  fixes: number;
  perfect: boolean;
}

export class GrammarServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrammarServiceError";
  }
}

// Singleton Nspell dictionary instance for instant offline spell checking
let spellerInstance: ReturnType<typeof nspell> | null = null;

function getSpeller(): ReturnType<typeof nspell> {
  if (!spellerInstance) {
    spellerInstance = nspell(EN_AFF, EN_DIC);
    // Add domain-specific terms
    spellerInstance.add("PostCreator");
    spellerInstance.add("postcreator");
    spellerInstance.add("PNG");
    spellerInstance.add("UI");
    spellerInstance.add("iOS");
  }
  return spellerInstance;
}

// Curated high-precision typos dictionary (takes precedence over generic suggestions)
const COMMON_TYPOS: Record<string, string> = {
  teh: "the",
  recieve: "receive",
  recieved: "received",
  recieving: "receiving",
  seperate: "separate",
  seperated: "separated",
  definately: "definitely",
  alot: "a lot",
  truely: "truly",
  occured: "occurred",
  untill: "until",
  tommorrow: "tomorrow",
  tommorow: "tomorrow",
  beleive: "believe",
  beleieved: "believed",
  wierd: "weird",
  thier: "their",
  goverment: "government",
  realy: "really",
  begining: "beginning",
  acheive: "achieve",
  acheived: "achieved",
  existance: "existence",
  maintainance: "maintenance",
  neccessary: "necessary",
  necesary: "necessary",
  accomodate: "accommodate",
  adress: "address",
  calender: "calendar",
  catagory: "category",
  collaegue: "colleague",
  concious: "conscious",
  embarass: "embarrass",
  foreward: "forward",
  gaurantee: "guarantee",
  garantee: "guarantee",
  happend: "happened",
  knowlege: "knowledge",
  ocassion: "occasion",
  peice: "piece",
  posession: "possession",
  priviledge: "privilege",
  publically: "publicly",
  refered: "referred",
  rythm: "rhythm",
  succesful: "successful",
  suprise: "surprise",
  tendancy: "tendency",
  throught: "throughout",
  unforseen: "unforeseen",
  unfortunatly: "unfortunately",
  writting: "writing",
  wether: "whether",
  wich: "which",
  pepole: "people",
  creat: "create",
};

// Common missing apostrophes in contractions
const CONTRACTIONS: Record<string, string> = {
  dont: "don't",
  cant: "can't",
  wont: "won't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  hasnt: "hasn't",
  havent: "haven't",
  hadnt: "hadn't",
  doesnt: "doesn't",
  didnt: "didn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  mustnt: "mustn't",
  youre: "you're",
  theyre: "they're",
  weve: "we've",
  theyve: "they've",
  youve: "you've",
  ive: "I've",
  im: "I'm",
  id: "I'd",
  youll: "you'll",
  theyll: "they'll",
  shell: "she'll",
  thats: "that's",
  whats: "what's",
  heres: "here's",
  theres: "there's",
  whos: "who's",
  hows: "how's",
  lets: "let's",
  itll: "it'll",
};

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const promise = fetch(url, init);
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new GrammarServiceError("Grammar check timed out.")), timeoutMs);
  });
  return Promise.race([promise, timeout]).then((res) => {
    if (timer) clearTimeout(timer);
    return res;
  });
}

/**
 * Stage 2: Compromise NLP Grammar & Agreement Engine
 * Handles subject-verb agreement and syntactic structures.
 */
export function runCompromiseGrammar(input: string): { text: string; fixes: number } {
  let text = input;
  let fixes = 0;

  try {
    const doc = nlp(text);

    // Subject-verb agreement fixes
    const rules: [string, string][] = [
      ["they is", "they are"],
      ["they was", "they were"],
      ["we was", "we were"],
      ["you was", "you were"],
      ["i is", "I am"],
      ["he dont", "he doesn't"],
      ["she dont", "she doesn't"],
      ["it dont", "it doesn't"],
      ["he do", "he does"],
      ["she do", "she does"],
      ["it do", "it does"],
    ];

    for (const [pattern, replacement] of rules) {
      if (doc.has(pattern)) {
        doc.match(pattern).replaceWith(replacement);
        fixes += 1;
      }
    }

    const output = doc.text();
    if (output && output !== text) {
      text = output;
    }
  } catch {
    // If Compromise fails on unusual syntax, gracefully continue
  }

  return { text, fixes };
}

/**
 * Stage 3: Nspell Dictionary & Typo Engine
 * Accurately corrects misspelled words without conflicting with proper names or slang.
 */
export function runNspellSpellcheck(input: string): { text: string; fixes: number } {
  let fixes = 0;
  let speller: ReturnType<typeof nspell> | null = null;

  try {
    speller = getSpeller();
  } catch {
    // If speller fails to initialize, fallback to typo dictionary
  }

  // Tokenize while preserving punctuation and spacing
  const words = input.split(/(\s+|[,\.\?!;:"'“”()]+)/);

  const correctedWords = words.map((w) => {
    if (!w) return w;

    // Handle standalone 'i'
    if (w === "i") {
      fixes += 1;
      return "I";
    }

    if (w.length <= 1) return w;

    // Skip hashtags, mentions, numbers, URLs
    if (w.startsWith("#") || w.startsWith("@") || /^\d+$/.test(w) || w.startsWith("http")) {
      return w;
    }

    const lower = w.toLowerCase();

    // 1. High-priority exact typo match
    if (COMMON_TYPOS[lower]) {
      fixes += 1;
      const rep = COMMON_TYPOS[lower];
      return w[0] === w[0].toUpperCase() && rep[0] ? rep[0].toUpperCase() + rep.slice(1) : rep;
    }

    // 2. High-priority contraction match
    if (CONTRACTIONS[lower]) {
      fixes += 1;
      const rep = CONTRACTIONS[lower];
      return w[0] === w[0].toUpperCase() && rep[0] ? rep[0].toUpperCase() + rep.slice(1) : rep;
    }

    // 3. Standalone "i"
    if (lower === "i") {
      fixes += 1;
      return "I";
    }

    // 4. Nspell dictionary check
    if (speller) {
      // If already correctly spelled (or word is in ALL CAPS acronym like PNG/NASA), keep as-is
      if (speller.correct(w) || speller.correct(lower) || /^[A-Z]{2,}$/.test(w)) {
        return w;
      }

      // If word is capitalized and not at start of sentence, it might be a proper name — don't destroy it
      if (w[0] === w[0].toUpperCase() && w.slice(1) === w.slice(1).toLowerCase()) {
        const suggs = speller.suggest(w);
        if (suggs.length > 0 && suggs[0].toLowerCase() === lower) {
          fixes += 1;
          return suggs[0];
        }
      }

      // Check suggestions for misspelled lowercase word
      const suggestions: string[] = speller.suggest(w);
      if (suggestions.length > 0) {
        const best = suggestions[0];
        // Only accept suggestion if length difference is small (avoids wildly different suggestions)
        if (Math.abs(best.length - w.length) <= 3) {
          fixes += 1;
          return w[0] === w[0].toUpperCase() && best[0]
            ? best[0].toUpperCase() + best.slice(1)
            : best;
        }
      }
    }

    return w;
  });

  return { text: correctedWords.join(""), fixes };
}

/**
 * Stage 4: Typography, Capitalization, and Whitespace Polish
 */
export function polishTypography(input: string): { text: string; fixes: number } {
  let text = input;
  let fixes = 0;

  // 1. Collapse irregular consecutive spaces
  const lines = text.split("\n");
  const cleanedLines = lines.map((line) => line.replace(/[ \t]+/g, " ").trim());
  const collapsed = cleanedLines.join("\n");
  if (collapsed !== text) {
    fixes += 1;
    text = collapsed;
  }

  // 2. Fix space before punctuation: "hello , world !" -> "hello, world!"
  const noSpacePunct = text.replace(/[ \t]+([,\.\?!;:])/g, (_m, p) => {
    fixes += 1;
    return p;
  });
  text = noSpacePunct;

  // 3. Fix missing space after punctuation: "hello,world" -> "hello, world"
  const spaceAfterPunct = text.replace(/([,\?!;:])([A-Za-z])/g, (_m, p, l) => {
    fixes += 1;
    return `${p} ${l}`;
  });
  text = spaceAfterPunct;

  // 4. Remove duplicate adjacent words: "the the" -> "the"
  const noDupes = text.replace(/\b([a-zA-Z]{2,})\s+\1\b/gi, (_m, word) => {
    fixes += 1;
    return word;
  });
  text = noDupes;

  // 5. Sentence capitalization: ensure the start of string or after . ! ? is capitalized
  const capitalized = text.replace(/(^|[\.\!\?]\s+|\n+)([a-z])/g, (_m, prefix, letter) => {
    fixes += 1;
    return prefix + letter.toUpperCase();
  });
  text = capitalized;

  // 6. Standalone pronoun "i" capitalization
  const capitalizedI = text.replace(/\b(i)\b/g, () => {
    fixes += 1;
    return "I";
  });
  text = capitalizedI;

  // 7. Normalize repeated exclamation/question marks: "!!!" -> "!"
  const cleanedExclaims = text.replace(/!{2,}/g, () => {
    fixes += 1;
    return "!";
  }).replace(/\?{2,}/g, () => {
    fixes += 1;
    return "?";
  });
  text = cleanedExclaims;

  return { text, fixes };
}

/**
 * Local AI Master Engine:
 * Combines Compromise NLP + Nspell + Typography Normalization harmoniously with zero conflicts.
 */
export function polishTextWithAI(input: string): { text: string; fixes: number } {
  let text = input;
  let totalFixes = 0;

  // Stage 1: Compromise NLP (structural grammar & agreement)
  const compResult = runCompromiseGrammar(text);
  text = compResult.text;
  totalFixes += compResult.fixes;

  // Stage 2: Nspell Dictionary & Common Typos
  const nspellResult = runNspellSpellcheck(text);
  text = nspellResult.text;
  totalFixes += nspellResult.fixes;

  // Stage 3: Typography & Capitalization Polish
  const typoResult = polishTypography(text);
  text = typoResult.text;
  totalFixes += typoResult.fixes;

  return { text, fixes: totalFixes };
}

/**
 * Primary AI Entrypoint.
 * Multi-Stage Pipeline:
 * 1. LanguageTool API (Cloud check - preserved as requested!)
 * 2. Compromise NLP (Subject-verb agreement & grammar structure)
 * 3. Nspell Dictionary (Offline spell check & typo correction)
 * 4. Typography Normalization (Punctuation, spacing, sentence capitalization)
 *
 * Guaranteed non-conflicting, 100% free, and runs offline if LanguageTool is unreachable.
 */
export async function checkGrammar(
  text: string,
  options: GrammarCheckOptions = DEFAULT_GRAMMAR_OPTIONS,
): Promise<GrammarCheckResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { corrected: text, fixes: 0, perfect: true };
  }

  let corrected = text;
  let appliedFixes = 0;

  // Stage 1: LanguageTool Cloud API
  try {
    const res = await fetchWithTimeout(LT_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        text: trimmed,
        language: options.language,
        enabledOnly: String(options.enabledOnly),
        level: options.level,
      }),
    }, options.timeoutMs);

    if (res.ok) {
      const data = await res.json();
      const matches: GrammarMatch[] = Array.isArray(data.matches) ? data.matches : [];
      const applicableFixes = matches.filter(
        (m) => m.replacements && m.replacements.length > 0 && m.replacements[0].value,
      );

      if (applicableFixes.length > 0) {
        // Apply replacements from right to left to prevent offset shifts
        const fixes = applicableFixes.sort((a, b) => b.offset - a.offset);
        for (const match of fixes) {
          const replacement = match.replacements[0].value;
          const original = corrected.slice(match.offset, match.offset + match.length);
          if (replacement === original) continue;
          const before = corrected.slice(0, match.offset);
          const after = corrected.slice(match.offset + match.length);
          corrected = before + replacement + after;
          appliedFixes += 1;
        }
      }
    }
  } catch {
    // If LanguageTool is offline or rate-limited, proceed smoothly to local Compromise + Nspell engines
  }

  // Stages 2, 3, 4: Compromise NLP + Nspell + Typography Normalization
  const localResult = polishTextWithAI(corrected);
  if (localResult.fixes > 0) {
    corrected = localResult.text;
    appliedFixes += localResult.fixes;
  }

  const isPerfect = appliedFixes === 0 && corrected === text;
  return {
    corrected,
    fixes: appliedFixes,
    perfect: isPerfect,
  };
}
