/**
 * StudyOS Kelas 9 — HTML5 Canvas Photo Compression Utility
 * Copyright (c) 2026 Hanif. All rights reserved.
 */
export interface CompressedImageResult {
  dataUrl: string;
  originalKB: number;
  compressedKB: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Compresses an uploaded File or raw DataURL via HTML5 <canvas>:
 * - Resizes maximum dimension to maxDimension (default 1400px) preserving aspect ratio
 * - Encodes to image/webp (or image/jpeg fallback) at quality 0.75
 */
export async function compressImageViaCanvas(
  source: File | string,
  maxDimension = 1400,
  quality = 0.75
): Promise<CompressedImageResult> {
  const originalKB =
    typeof source === 'string'
      ? Math.round((source.length * 3) / 4 / 1024)
      : Math.round(source.size / 1024);

  const rawDataUrl =
    typeof source === 'string' ? source : await readFileAsDataUrl(source);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let targetWidth = img.naturalWidth || img.width || 800;
      let targetHeight = img.naturalHeight || img.height || 600;

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth >= targetHeight) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
          targetWidth = maxDimension;
        } else {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
          targetHeight = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Gagal menginisialisasi konteks Canvas 2D'));
        return;
      }

      // Fill white background for transparent PNGs before encoding
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let format = 'image/webp';
      let currentQuality = quality;
      let compressedDataUrl = canvas.toDataURL('image/webp', currentQuality);

      // Fallback to image/jpeg if browser doesn't support image/webp encoding
      if (!compressedDataUrl.startsWith('data:image/webp')) {
        format = 'image/jpeg';
        compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
      }

      // Ensure compressed image fits cleanly in Cloud Firestore & IndexedDB (<180KB)
      while (compressedDataUrl.length > 180000 && currentQuality > 0.35) {
        currentQuality = Math.max(0.32, currentQuality - 0.12);
        compressedDataUrl = canvas.toDataURL(format, currentQuality);
      }

      const compressedKB = Math.max(
        1,
        Math.round(((compressedDataUrl.length - 22) * 3) / 4 / 1024)
      );

      resolve({
        dataUrl: compressedDataUrl,
        originalKB: Math.max(originalKB, compressedKB),
        compressedKB,
        width: targetWidth,
        height: targetHeight,
        format,
      });
    };
    img.onerror = () => reject(new Error('Gagal memuat gambar untuk kompresi Canvas'));
    img.src = rawDataUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a realistic high-clarity study note sheet image via HTML5 Canvas
 * so initial pre-loaded notes and mistake logs are 100% self-contained, crisp when zoomed,
 * and require zero external image URLs.
 */
export function generateSyntheticNoteImage(options: {
  subjectBadge: string;
  title: string;
  subtitle: string;
  formulas: string[];
  diagramType: 'parabola' | 'coulomb' | 'mendel' | 'cylinder';
}): string {
  if (typeof document === 'undefined') {
    return '';
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Paper background
  ctx.fillStyle = '#FCFBF7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid lines (buku catatan kotak/garis)
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  for (let y = 110; y < canvas.height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(canvas.width - 60, y);
    ctx.stroke();
  }

  // Left margin line (Cornell style)
  ctx.strokeStyle = '#FCA5A5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(110, 40);
  ctx.lineTo(110, canvas.height - 40);
  ctx.stroke();

  // Header metadata
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(options.title, 135, 78);

  ctx.fillStyle = '#2563EB';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(`${options.subjectBadge}  |  ${options.subtitle}`, 135, 112);

  // Formula / Steps block on left side
  ctx.fillStyle = '#0F172A';
  ctx.font = '500 21px "JetBrains Mono", monospace';
  options.formulas.forEach((line, idx) => {
    const y = 175 + idx * 58;
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(135, y - 30, 560, 44);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(135, y - 30, 560, 44);
    ctx.fillStyle = '#0F172A';
    ctx.fillText(line, 152, y - 2);
  });

  // Diagram box on right side
  const boxX = 730;
  const boxY = 145;
  const boxW = 400;
  const boxH = 420;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.save();
  if (options.diagramType === 'parabola') {
    // Coordinate axes
    const cx = boxX + 200;
    const cy = boxY + 260;
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 30, cy);
    ctx.lineTo(boxX + boxW - 30, cy);
    ctx.moveTo(cx, boxY + 30);
    ctx.lineTo(cx, boxY + boxH - 30);
    ctx.stroke();

    // Parabola y = x^2 - 4x + 3
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let px = -110; px <= 150; px += 4) {
      const xVal = px / 40;
      const yVal = xVal * xVal - 1.2 * xVal - 1.5;
      const drawX = cx + px;
      const drawY = cy - yVal * 45;
      if (drawY > boxY + 20 && drawY < boxY + boxH - 20) {
        if (px === -110) ctx.moveTo(drawX, drawY);
        else ctx.lineTo(drawX, drawY);
      }
    }
    ctx.stroke();

    // Vertex dot
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(cx + 24, cy + 84, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText('Titik Puncak (xp, yp)', cx - 20, cy + 112);
  } else if (options.diagramType === 'coulomb') {
    const yMid = boxY + 200;
    // Charge Q1 (+)
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(boxX + 100, yMid, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('+q1', boxX + 80, yMid + 8);

    // Charge Q2 (-)
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.arc(boxX + 300, yMid, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('-q2', boxX + 280, yMid + 8);

    // Distance arrow r
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(boxX + 100, yMid + 65);
    ctx.lineTo(boxX + 300, yMid + 65);
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 17px "JetBrains Mono", monospace';
    ctx.fillText('Jarak pisah (r)', boxX + 140, yMid + 95);
  } else if (options.diagramType === 'mendel') {
    // Punnett Square 2x2
    const startX = boxX + 80;
    const startY = boxY + 90;
    const cell = 120;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, cell * 2, cell * 2);
    ctx.beginPath();
    ctx.moveTo(startX + cell, startY);
    ctx.lineTo(startX + cell, startY + cell * 2);
    ctx.moveTo(startX, startY + cell);
    ctx.lineTo(startX + cell * 2, startY + cell);
    ctx.stroke();

    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('M', startX + 50, startY - 15);
    ctx.fillText('m', startX + 170, startY - 15);
    ctx.fillText('M', startX - 35, startY + 68);
    ctx.fillText('m', startX - 35, startY + 188);

    ctx.fillStyle = '#0F172A';
    ctx.fillText('MM', startX + 38, startY + 68);
    ctx.fillText('Mm', startX + 158, startY + 68);
    ctx.fillText('Mm', startX + 38, startY + 188);
    ctx.fillStyle = '#16A34A';
    ctx.fillText('mm', startX + 158, startY + 188);
    ctx.font = '15px "JetBrains Mono", monospace';
    ctx.fillText('Rasio Fenotipe = 3 : 1', startX + 20, startY + cell * 2 + 40);
  } else {
    // Cylinder / Bangun Ruang Sisi Lengkung
    const cx = boxX + 200;
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, boxY + 100, 95, 32, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, boxY + 300, 95, 32, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 95, boxY + 100);
    ctx.lineTo(cx - 95, boxY + 300);
    ctx.moveTo(cx + 95, boxY + 100);
    ctx.lineTo(cx + 95, boxY + 300);
    ctx.stroke();

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('r = 7 cm', cx + 10, boxY + 95);
    ctx.fillText('t = 20 cm', cx + 105, boxY + 205);
  }
  ctx.restore();

  // Bottom highlight box
  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(135, 610, 995, 165);
  ctx.strokeStyle = '#93C5FD';
  ctx.lineWidth = 2;
  ctx.strokeRect(135, 610, 995, 165);

  ctx.fillStyle = '#1E40AF';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CATATAN PENTING UJIAN KELAS 9:', 158, 648);
  ctx.fillStyle = '#1E293B';
  ctx.font = '17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Perhatikan satuan SI dan tanda positif/negatif sebelum mensubstitusi nilai ke dalam rumus utama.',
    158,
    688
  );
  ctx.fillText(
    'Gunakan pengecekan balik (substitusi ulang) untuk memastikan hasil akhir tidak keliru hitung.',
    158,
    724
  );

  return canvas.toDataURL('image/jpeg', 0.78);
}
