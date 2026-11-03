/**
 * Many Myanmar files are typed with the Zawgyi font instead of Unicode:
 * the text looks right in Excel / Word on that computer but is scrambled on
 * the web. These helpers notice Zawgyi text and convert it to Unicode
 * (conversion rules from Rabbit, MIT licence).
 */
import Rabbit from 'rabbit-node';

const MYANMAR = /[က-႟]/;
/** Sequences that appear in Zawgyi text but not in correct Unicode text. */
const ZAWGYI =
  /ေျ|(?:^|[\s(\[])[ေျ]|[ဢ-ူဲ-္ျ-ွ၀-၏]ျ|္$|ွြ|ျြ|[က-အ]္[ယရဝဟဢ-ဿ]|်ှ|ံု|[၀-၉][ုံ]|ေေ|[ၠ-႗]/m;

export const looksLikeZawgyi = (text: string) => MYANMAR.test(text) && ZAWGYI.test(text);

/**
 * Converts a whole file's text to Unicode when it is mostly Zawgyi.
 * Decided for the file as a whole, so one odd Unicode cell is left alone.
 */
export function unicodeTexts(texts: string[]): { texts: string[]; converted: boolean } {
  const myanmar = texts.filter((t) => MYANMAR.test(t));
  if (!myanmar.length) return { texts, converted: false };
  const zawgyi = myanmar.filter(looksLikeZawgyi).length;
  if (zawgyi / myanmar.length < 0.2) return { texts, converted: false };
  return { texts: texts.map((t) => (MYANMAR.test(t) ? Rabbit.zg2uni(t) : t)), converted: true };
}
