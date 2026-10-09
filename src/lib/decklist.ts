export interface DecklistLine {
  qty: number;
  name: string;
  set?: string;
  collectorNumber?: string;
  isCommander: boolean;
}

const SECTION_COMMANDER = /^(\/\/\s*)?(commanders?|command zone)\s*:?\s*$/i;
const SECTION_OTHER = /^(\/\/\s*)?(deck|main(board)?|sideboard|maybeboard|companion|creatures?|lands?|instants?|sorcer(y|ies)|artifacts?|enchantments?|planeswalkers?|battles?|other)\b.*$/i;

/**
 * Parses pasted decklists in the common export formats:
 * "1 Sol Ring", "1x Sol Ring (CMM) 400 *F*", "Sol Ring",
 * Archidekt tags like "[Commander{top}]", Moxfield "*CMDR*",
 * and "Commander" section headers.
 */
export function parseDecklist(text: string): DecklistLine[] {
  const lines: DecklistLine[] = [];
  let inCommander = false;
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) {
      // A blank line ends a commander section in MTGA-style exports.
      inCommander = false;
      continue;
    }
    if (SECTION_COMMANDER.test(line)) {
      inCommander = true;
      continue;
    }
    if (SECTION_OTHER.test(line) && !/^\d/.test(line)) {
      inCommander = false;
      continue;
    }
    if (line.startsWith("//") || line.startsWith("#")) continue;

    let isCommander = inCommander;
    const tags = line.match(/\[([^\]]*)\]/);
    if (tags) {
      if (/commander/i.test(tags[1])) isCommander = true;
      line = line.replace(/\[[^\]]*\]/g, "").trim();
    }
    if (/\*CMDR\*/i.test(line)) isCommander = true;
    line = line.replace(/\*[A-Z]+\*/gi, "").replace(/\^[^^]*\^/g, "").trim();

    const m = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    const qty = m ? parseInt(m[1], 10) : 1;
    let rest = (m ? m[2] : line).trim();

    let set: string | undefined;
    let collectorNumber: string | undefined;
    const printing = rest.match(/^(.*?)\s+\(([A-Za-z0-9]{2,6})\)\s*([A-Za-z0-9★-]+)?\s*$/);
    if (printing) {
      rest = printing[1].trim();
      set = printing[2].toLowerCase();
      collectorNumber = printing[3];
    }
    if (!rest || qty <= 0) continue;
    lines.push({ qty, name: rest, set, collectorNumber, isCommander });
  }
  return lines;
}
