/**
 * Copyright (c) 2026 Hanif. All rights reserved.
 * StudyOS Kelas 9 — Offline Study Pack & Formula/Active Recall Download Engine.
 */

import {
  CurriculumSubject,
  Flashcard,
  FormulaCard,
} from '../types/study';
import { groupFormulasByChapter, resolveSubFormulas } from './studyLogic';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function triggerBlobDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Generates and downloads a standalone, offline-ready Interactive HTML Study Guide
 * containing all grouped Formulas (Apa yang Dicari : Rumus) + Interactive Flip Flashcards.
 */
export function downloadInteractiveStudyHtml(
  formulas: FormulaCard[],
  flashcards: Flashcard[],
  curriculum: CurriculumSubject[],
  filterLabel = 'Lengkap Matematika, Fisika, Biologi IPA & Bahasa Inggris Kelas 9'
): string {
  const groups = groupFormulasByChapter(formulas, curriculum, {});
  const subjectMap = new Map(curriculum.map((s) => [s.id, s.name]));
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formulaGroupsHtml = groups
    .map((group) => {
      const cardsHtml = group.formulas
        .map((f) => {
          const rows = resolveSubFormulas(f)
            .map(
              (sf) => `
              <tr>
                <td class="target-col">${escapeHtml(sf.target)}</td>
                <td class="expr-col"><code>${escapeHtml(sf.expr)}</code></td>
              </tr>`
            )
            .join('');

          return `
          <div class="formula-card" data-search="${escapeHtml(
            `${f.title} ${f.formula} ${f.variables} ${f.example} ${group.subjectName} ${group.chapterTitle}`.toLowerCase()
          )}">
            <div class="formula-card-header">
              <h4>${escapeHtml(f.title)}</h4>
              <span class="meta-tag">${escapeHtml(group.subjectShortCode)} · Sem ${f.semester}</span>
            </div>
            <table class="formula-table">
              <thead>
                <tr>
                  <th>Apa yang Dicari / Konsep</th>
                  <th>Rumus / Pola Penyelesaian</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            <div class="formula-details">
              <p><strong>Keterangan Variabel:</strong> ${escapeHtml(f.variables)}</p>
              <p><strong>Contoh Soal & Hitungan:</strong> <code>${escapeHtml(f.example)}</code></p>
              ${
                f.steps
                  ? `<p><strong>Langkah Penyelesaian:</strong> ${escapeHtml(f.steps)}</p>`
                  : ''
              }
              ${
                f.examTip
                  ? `<p class="exam-tip"><strong>Tips & Jebakan Ujian:</strong> ${escapeHtml(f.examTip)}</p>`
                  : ''
              }
            </div>
          </div>`;
        })
        .join('');

      return `
      <section class="chapter-section">
        <div class="chapter-banner">
          <h3>${escapeHtml(group.subjectName)} — Semester ${group.semester} · Bab ${group.chapterNumber}: ${escapeHtml(group.chapterTitle)}</h3>
          <span>${group.formulas.length} Topik Rumus</span>
        </div>
        ${cardsHtml}
      </section>`;
    })
    .join('');

  const flashcardsHtml = flashcards
    .map((fc, idx) => {
      const subjName = subjectMap.get(fc.subjectId) || fc.subjectId.toUpperCase();
      return `
      <div class="fc-item" onclick="this.classList.toggle('flipped')" data-search="${escapeHtml(
        `${fc.front} ${fc.back} ${subjName}`.toLowerCase()
      )}">
        <div class="fc-meta">Kartu #${idx + 1} · ${escapeHtml(subjName)} (Semester ${fc.semester}) — Klik untuk balik jawaban</div>
        <div class="fc-front"><strong>Pertanyaan / Soal Active Recall:</strong><br/>${escapeHtml(fc.front)}</div>
        <div class="fc-back"><strong>Kunci Jawaban & Konsep:</strong><br/>${escapeHtml(fc.back)}</div>
      </div>`;
    })
    .join('');

  const htmlDoc = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Modul Rumus & Active Recall Kelas 9 — Copyright © Hanif</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 60px;
      font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif;
      background: #F8FAFC;
      color: #0F172A;
      line-height: 1.55;
    }
    .container { max-width: 1080px; margin: 0 auto; }
    header {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 20px;
    }
    .brand-kicker {
      font-family: monospace;
      font-size: 12px;
      color: #2563EB;
      font-weight: 700;
      text-transform: uppercase;
    }
    h1 { margin: 6px 0 8px; font-size: 24px; }
    .sub-info { font-size: 13px; color: #475569; margin: 0; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 16px 0 24px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      padding: 12px 16px;
      border-radius: 10px;
      align-items: center;
      justify-content: space-between;
    }
    .search-input {
      flex: 1;
      min-width: 240px;
      padding: 10px 14px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 14px;
    }
    .btn {
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #2563EB;
      background: #2563EB;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .chapter-section { margin-bottom: 28px; }
    .chapter-banner {
      background: #0F172A;
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .chapter-banner h3 { margin: 0; font-size: 15px; }
    .chapter-banner span { font-size: 12px; font-family: monospace; color: #93C5FD; }
    .formula-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .formula-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .formula-card-header h4 { margin: 0; font-size: 16px; color: #0F172A; }
    .meta-tag { font-family: monospace; font-size: 12px; color: #2563EB; font-weight: 700; }
    .formula-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 13.5px;
    }
    .formula-table th, .formula-table td {
      border: 1px solid #E2E8F0;
      padding: 8px 12px;
      text-align: left;
    }
    .formula-table th { background: #F1F5F9; font-weight: 700; color: #334155; }
    .target-col { width: 44%; font-weight: 600; color: #1E293B; }
    .expr-col code {
      font-family: "JetBrains Mono", Consolas, monospace;
      font-weight: 700;
      color: #2563EB;
      font-size: 13.5px;
    }
    .formula-details p { margin: 5px 0; font-size: 13px; color: #334155; }
    .exam-tip {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      padding: 8px 12px;
      border-radius: 6px;
      color: #92400E !important;
    }
    .fc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .fc-item {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 14px 16px;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .fc-item:hover { border-color: #2563EB; }
    .fc-meta { font-size: 11px; font-family: monospace; color: #64748B; margin-bottom: 6px; }
    .fc-front { font-size: 14px; color: #0F172A; margin-bottom: 8px; }
    .fc-back {
      font-size: 13.5px;
      color: #166534;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      padding: 10px;
      border-radius: 8px;
      margin-top: 8px;
    }
    footer {
      margin-top: 40px;
      text-align: center;
      font-size: 13px;
      color: #475569;
      border-top: 1px solid #E2E8F0;
      padding-top: 20px;
    }
    @media print {
      .toolbar { display: none; }
      body { background: #FFFFFF; padding: 0; }
      .formula-card, .fc-item { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-kicker">STUDYOS KELAS 9 · MODUL BELAJAR MANDIRI OFFLINE · COPYRIGHT © HANIF</div>
      <h1>Kitab Ringkasan Rumus & Kartu Active Recall Kelas 9 SMP</h1>
      <p class="sub-info">Cakupan: ${escapeHtml(filterLabel)} · Total ${formulas.length} Tabel Rumus & ${flashcards.length} Kartu Active Recall · Diunduh pada ${escapeHtml(dateStr)} · Hak Cipta © Hanif</p>
    </header>

    <div class="toolbar">
      <input
        type="search"
        id="offlineSearch"
        class="search-input"
        placeholder="Cari rumus, bab, apa yang dicari, atau kata kunci soal..."
        oninput="filterItems(this.value)"
      />
      <button class="btn" onclick="window.print()">Cetak / Simpan PDF</button>
    </div>

    <h2>Bagian 1: Tabel Ringkasan Rumus per Bab (Apa yang Dicari : Rumus)</h2>
    <div id="formulasContainer">
      ${formulaGroupsHtml}
    </div>

    <h2 style="margin-top: 36px;">Bagian 2: Bank Kartu Tanya-Jawab Active Recall (${flashcards.length} Kartu)</h2>
    <div class="fc-grid" id="flashcardsContainer">
      ${flashcardsHtml}
    </div>

    <footer>
      <strong>Copyright © 2026 Hanif</strong> — Seluruh Hak Cipta Dilindungi.<br/>
      Disusun untuk membantu belajar efisien Siswa SMP Kelas 9 (Semester 1 & 2).
    </footer>
  </div>

  <script>
    function filterItems(query) {
      var q = (query || '').trim().toLowerCase();
      var cards = document.querySelectorAll('.formula-card, .fc-item');
      for (var i = 0; i < cards.length; i++) {
        var hay = cards[i].getAttribute('data-search') || '';
        cards[i].style.display = (!q || hay.indexOf(q) !== -1) ? '' : 'none';
      }
    }
  </script>
</body>
</html>`;

  triggerBlobDownload(
    htmlDoc,
    'Rumus_dan_Active_Recall_Kelas9_Hanif.html',
    'text/html;charset=utf-8'
  );
  return htmlDoc;
}

/**
 * Generates and downloads a structured Markdown (.md) Study Guide
 * containing all Formulas and Active Recall Flashcards with Copyright © Hanif.
 */
export function downloadStudyMarkdown(
  formulas: FormulaCard[],
  flashcards: Flashcard[],
  curriculum: CurriculumSubject[]
): string {
  const groups = groupFormulasByChapter(formulas, curriculum, {});
  const subjectMap = new Map(curriculum.map((s) => [s.id, s.name]));
  const lines: string[] = [
    '# KITAB RINGKASAN RUMUS & ACTIVE RECALL KELAS 9 SMP',
    '> **Copyright © 2026 Hanif — StudyOS Kelas 9. All Rights Reserved.**',
    '',
    `Total Materi: **${formulas.length} Tabel Rumus Utama** & **${flashcards.length} Kartu Tanya-Jawab Active Recall**`,
    '',
    '---',
    '',
    '## BAGIAN 1: RINGKASAN RUMUS PER BAB (APA YANG DICARI : RUMUS)',
    '',
  ];

  for (const grp of groups) {
    lines.push(
      `### ${grp.subjectName} (Semester ${grp.semester}) — Bab ${grp.chapterNumber}: ${grp.chapterTitle}`
    );
    lines.push('');
    for (const f of grp.formulas) {
      lines.push(`#### ${f.title}`);
      lines.push('| Apa yang Dicari / Konsep | Rumus / Penyelesaian |');
      lines.push('| :--- | :--- |');
      for (const sf of resolveSubFormulas(f)) {
        lines.push(`| ${sf.target} | \`${sf.expr}\` |`);
      }
      lines.push('');
      lines.push(`- **Keterangan Variabel:** ${f.variables}`);
      lines.push(`- **Contoh Penerapan:** \`${f.example}\``);
      if (f.steps) {
        lines.push(`- **Langkah Penyelesaian:** ${f.steps.replace(/\n/g, ' ')}`);
      }
      if (f.examTip) {
        lines.push(`- **Tips & Jebakan Ujian:** ${f.examTip}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## BAGIAN 2: KUMPULAN TANYA-JAWAB ACTIVE RECALL');
  lines.push('');

  flashcards.forEach((fc, idx) => {
    const subjName = subjectMap.get(fc.subjectId) || fc.subjectId.toUpperCase();
    lines.push(
      `### ${idx + 1}. [${subjName} · Sem ${fc.semester}] ${fc.front}`
    );
    lines.push(`- **Jawaban / Rumus Kunci:** ${fc.back}`);
    lines.push('');
  });

  lines.push('---');
  lines.push('**Copyright © 2026 Hanif — StudyOS Kelas 9**');

  const mdContent = lines.join('\n');
  triggerBlobDownload(
    mdContent,
    'Ringkasan_Rumus_Active_Recall_Kelas9_Hanif.md',
    'text/markdown;charset=utf-8'
  );
  return mdContent;
}

/**
 * Generates and downloads a portable JSON pack of all Formulas and Active Recall Flashcards.
 */
export function downloadStudyJsonPack(
  formulas: FormulaCard[],
  flashcards: Flashcard[]
): string {
  const payload = {
    copyright: 'Copyright © 2026 Hanif — StudyOS Kelas 9. All rights reserved.',
    exportedAt: new Date().toISOString(),
    totalFormulas: formulas.length,
    totalFlashcards: flashcards.length,
    formulas,
    flashcards,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  triggerBlobDownload(
    jsonStr,
    'Paket_Rumus_Active_Recall_Kelas9_Hanif.json',
    'application/json;charset=utf-8'
  );
  return jsonStr;
}
