/* =====================================================================
   xlsx-lite.js — قراءة وكتابة ملفات Excel (.xlsx) بدون أي مكتبة (v15.1)
   ملف xlsx = ZIP فيه XML. القراءة: ZIP (Stored + Deflate عبر DecompressionStream
   الموجود في المتصفح، أو zlib في Node للاختبار) ← workbook/sharedStrings/sheets.
   الكتابة: ZIP «Stored» (بدون ضغط) + CRC32 — يفتح في Excel وGoogle Sheets وLibreOffice.
   الحدود: يقرأ القيم فقط (لا معادلات تُحسب؛ تُقرأ آخر قيمة محفوظة)، الخلايا المدمجة
   تظهر في أول خلية، التواريخ كأرقام Excel. الحد الأقصى 2MB للملف (نفس فحص الاستيراد).
   ===================================================================== */
(function (g) {
  "use strict";
  const td = new TextDecoder("utf-8"), te = new TextEncoder();
  const u16 = (b, o) => b[o] | (b[o + 1] << 8), u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

  async function inflateRaw(data) {
    if (typeof DecompressionStream != "undefined") {
      const ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(); w.write(data); w.close();
      return new Uint8Array(await new Response(ds.readable).arrayBuffer());
    }
    if (typeof require == "function") return new Uint8Array(require("zlib").inflateRawSync(data));
    throw new Error("المتصفح لا يدعم فك ضغط ملفات Excel — احفظ الملف CSV");
  }

  /* فك ZIP: نقرأ الفهرس المركزي (أدق من الرؤوس المحلية) */
  async function unzip(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let e = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("الملف ليس Excel (.xlsx) صالحًا");
    const n = u16(b, e + 10); let p = u32(b, e + 16); const files = {};
    for (let k = 0; k < n; k++) {
      if (u32(b, p) !== 0x02014b50) throw new Error("ملف Excel تالف");
      const method = u16(b, p + 10), csize = u32(b, p + 20), nl = u16(b, p + 28), xl = u16(b, p + 30), cl = u16(b, p + 32), off = u32(b, p + 42);
      const name = td.decode(b.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const lnl = u16(b, off + 26), lxl = u16(b, off + 28), start = off + 30 + lnl + lxl, raw = b.subarray(start, start + csize);
      if (method === 0) files[name] = raw; else if (method === 8) files[name] = await inflateRaw(raw); else throw new Error("نوع ضغط غير مدعوم في ملف Excel");
    }
    return files;
  }

  const ent = s => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, x) => x == "lt" ? "<" : x == "gt" ? ">" : x == "amp" ? "&" : x == "quot" ? '"' : x == "apos" ? "'" : x[1] == "x" || x[1] == "X" ? String.fromCodePoint(parseInt(x.slice(2), 16)) : String.fromCodePoint(+x.slice(1)));
  const attr = (tag, a) => { const m = tag.match(new RegExp("\\b" + a + '="([^"]*)"')); return m ? ent(m[1]) : null; };
  const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref || ""); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const tText = x => [...x.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => ent(m[1])).join("");

  /* قراءة الملف: ترجع {sheets:[{name, rows:[[...]]}]} — الأرقام كأرقام والنصوص كنصوص */
  async function read(bytes) {
    const f = await unzip(bytes), get = n => f[n] ? td.decode(f[n]) : "";
    const wb = get("xl/workbook.xml"); if (!wb) throw new Error("الملف ليس Excel (.xlsx) صالحًا");
    const rels = get("xl/_rels/workbook.xml.rels"), relMap = {};
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) relMap[attr(m[0], "Id")] = attr(m[0], "Target");
    const ss = [...get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => tText(m[1]));
    const sheets = [];
    for (const m of wb.matchAll(/<sheet\b[^>]*\/?>/g)) {
      const name = attr(m[0], "name"), rid = attr(m[0], "r:id"); let t = relMap[rid] || ""; t = t.replace(/^\/?xl\//, "").replace(/^\//, "");
      const xml = get("xl/" + t); const rows = [];
      for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const ri = +(attr(r[0].slice(0, r[0].indexOf(">") + 1), "r") || rows.length + 1) - 1, row = [];
        for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const tag = "<c" + c[1] + ">", ci = colIdx(attr(tag, "r")), ty = attr(tag, "t"), body = c[2] || "";
          const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
          let val = null;
          if (ty === "s") val = ss[+v] ?? ""; else if (ty === "inlineStr") val = tText(body); else if (ty === "str" || ty === "e") val = v != null ? ent(v) : ""; else if (ty === "b") val = v === "1"; else if (v != null) { const n = Number(v); val = isFinite(n) ? n : ent(v); }
          row[ci < 0 ? row.length : ci] = val;
        }
        rows[ri] = Array.from(row, x => x === undefined ? null : x);
      }
      sheets.push({ name, rows: Array.from(rows, r => r || []) });
    }
    return { sheets };
  }

  /* ---------------- الكتابة ---------------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(entries) {
    const parts = [], cen = []; let off = 0;
    const h16 = v => [v & 255, (v >>> 8) & 255], h32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    for (const [name, data] of entries) {
      const nb = te.encode(name), c = crc32(data);
      const loc = new Uint8Array([...h32(0x04034b50), ...h16(20), ...h16(0x0800), ...h16(0), ...h16(0), ...h16(0x21), ...h32(c), ...h32(data.length), ...h32(data.length), ...h16(nb.length), ...h16(0)]);
      parts.push(loc, nb, data);
      cen.push(new Uint8Array([...h32(0x02014b50), ...h16(20), ...h16(20), ...h16(0x0800), ...h16(0), ...h16(0), ...h16(0x21), ...h32(c), ...h32(data.length), ...h32(data.length), ...h16(nb.length), ...h16(0), ...h16(0), ...h16(0), ...h16(0), ...h32(0), ...h32(off)]), nb);
      off += loc.length + nb.length + data.length;
    }
    const cl = cen.reduce((s, x) => s + x.length, 0), end = new Uint8Array([...h32(0x06054b50), ...h16(0), ...h16(0), ...h16(entries.length), ...h16(entries.length), ...h32(cl), ...h32(off), ...h16(0)]);
    const all = [...parts, ...cen, end], out = new Uint8Array(all.reduce((s, x) => s + x.length, 0)); let p = 0; all.forEach(x => { out.set(x, p); p += x.length; }); return out;
  }
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const colName = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
  /* sheets: [{name, rows:[[...]], widths?:[..]}] — الصف الأول عناوين بخط عريض، الورقة من اليمين للشمال */
  function write(sheets) {
    const S = sheets.map((s, i) => {
      const rows = s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => { if (v == null || v === "") return ""; const ref = colName(ci) + (ri + 1), st = ri == 0 ? ' s="1"' : ""; return typeof v == "number" && isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${esc(v)}</t></is></c>`; }).join("")}</row>`).join("");
      const cols = (s.widths || []).length ? `<cols>${s.widths.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
      return [`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData></worksheet>`];
    });
    const names = sheets.map((s, i) => esc(String(s.name || "Sheet" + (i + 1)).replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31)));
    const files = [
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${S.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${S.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${S.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf fontId="1" applyFont="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]
    ].concat(S);
    return zip(files.map(([n, x]) => [n, te.encode(x)]));
  }

  const api = { read, write, unzip, crc32 };
  if (typeof module == "object" && module.exports) module.exports = api; else g.XLSX = api;
})(typeof window != "undefined" ? window : globalThis);
