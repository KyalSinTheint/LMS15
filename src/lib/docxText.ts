/**
 * Reads the paragraphs of a Word (.docx) file in the browser, with no extra
 * library: a .docx is a ZIP archive, and word/document.xml holds the text.
 */

export interface DocxParagraph {
  text: string;
  /** 1–4 for Word "Heading 1"…"Heading 4" / Title paragraphs, otherwise 0 */
  heading: number;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot open .docx files. Please use a recent Chrome, Edge, Safari or Firefox.');
  }
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Returns one file from a ZIP archive, or null when it is not there. */
async function readZipEntry(buf: ArrayBuffer, wanted: string): Promise<Uint8Array | null> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // End of central directory record: search backwards for its signature
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This file is not a valid .docx (Word) document.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < count && p + 46 <= buf.byteLength; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (name === wanted) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(start, start + compSize);
      if (method === 0) return raw;
      if (method === 8) return inflateRaw(raw);
      throw new Error('This .docx uses an unsupported compression method.');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export async function readDocxParagraphs(file: File): Promise<DocxParagraph[]> {
  const xmlBytes = await readZipEntry(await file.arrayBuffer(), 'word/document.xml');
  if (!xmlBytes) throw new Error('This file is not a Word document (word/document.xml is missing).');
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(xmlBytes), 'application/xml');
  const out: DocxParagraph[] = [];
  const paragraphs = doc.getElementsByTagNameNS(W, 'p');
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    let text = '';
    const walk = (node: Element) => {
      for (let c = node.firstElementChild; c; c = c.nextElementSibling) {
        if (c.namespaceURI === W) {
          if (c.localName === 't') text += c.textContent || '';
          else if (c.localName === 'tab') text += ' ';
          else if (c.localName === 'br' || c.localName === 'cr') text += '\n';
          else if (c.localName === 'p') continue; // nested paragraphs (text boxes) are read on their own
          else if (c.localName !== 'pPr' && c.localName !== 'rPr') walk(c);
        } else {
          walk(c);
        }
      }
    };
    walk(p);
    const style = p.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') || '';
    const m = style.match(/^(?:Heading|heading)\s*(\d)$/);
    const heading = m ? Math.min(4, Number(m[1])) : /^Title$/i.test(style) ? 1 : 0;
    for (const line of text.split('\n')) {
      const t = line.replace(/\s+/g, ' ').trim();
      if (t) out.push({ text: t, heading });
    }
  }
  return out;
}
