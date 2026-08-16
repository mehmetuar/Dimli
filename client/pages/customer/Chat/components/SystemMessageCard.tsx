import React from 'react';
import {
    SystemMessageRenderer,
    getSystemIcon,
    firstSystemToken,
    stripSystemMessageMarkers,
} from '../../../../components/UI/SystemMessageRenderer';

// §105 — Sistem mesajı kartı, TEK KAYNAK (MessageBubble + DemoChat).
//
// Sunucu şablon sözleşmesi (≈15 şablon aynı düzeni kullanır — koru, §105):
//   başlık satırı [+ token]  \n\n  token'la BAŞLAYAN detay satırları  \n\n  alt not(lar)
// Bu bileşen o sözleşmeyi görsel yapıya çevirir; sunucuya sıfır dokunuş.
//
// - Tek satır (\n yok) → kompakt mod: bugünkü ortalı görünüm birebir
//   (sabitleme "{{PINNED}} X bir mesajı sabitledi", anket duyurusu vb. değişmez).
// - Çok satır → kart modu: PollCard görsel dili — ikon madalyonu + sola hizalı
//   ikon+metin detay satırları + ince ayraçlı sönük alt not.

interface Props {
    text: string;
    /** Aksiyon butonları (PROPOSAL_ACTION vb.) kartın içinde en alta basılır */
    children?: React.ReactNode;
}

const TOKEN_AT_START = /^(\{\{\w+\}\}|\[ICON:\w+\])/;

const tokenNameOf = (line: string): string | null => {
    const m = /^(?:\{\{(\w+)\}\}|\[ICON:(\w+)\])/.exec(line.trim());
    return m ? (m[1] || m[2]).toUpperCase() : null;
};

export const SystemMessageCard: React.FC<Props> = ({ text, children }) => {
    const raw = text ?? '';

    // ── Kompakt mod: tek satır — bugünkü görünüm birebir ────────────────────
    if (!raw.includes('\n')) {
        return (
            <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-sm font-medium px-6 py-4 rounded-xl text-center w-full shadow-lg whitespace-pre-wrap">
                <SystemMessageRenderer text={raw} />
                {children}
            </div>
        );
    }

    // ── Kart modu — SATIR bazlı ayrıştırma ───────────────────────────────────
    // (bazı şablonlar başlıktan sonra \n\n değil tek \n kullanır — ikisi de desteklenir)
    // İlk dolu satır = başlık; token'la BAŞLAYAN satırlar = detay; kalanlar = alt not
    // (paragraf boşlukları korunur).
    const allLines = raw.split('\n');
    const firstIdx = allLines.findIndex((l) => l.trim().length > 0);
    const titleLine = firstIdx >= 0 ? allLines[firstIdx].trim() : '';
    const titleToken = firstSystemToken(titleLine);
    const titleText = stripSystemMessageMarkers(titleLine);
    const medallion = titleToken ? getSystemIcon(titleToken) : null;

    const detailLines: string[] = [];
    const footerRaw: string[] = [];
    for (const line of allLines.slice(firstIdx + 1)) {
        const t = line.trim();
        if (t && TOKEN_AT_START.test(t)) detailLines.push(t);
        else footerRaw.push(t); // boş satırlar paragraf ayracı olarak kalır
    }
    const footerText = footerRaw.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    return (
        <div className="bg-slate-800/95 border border-slate-700 rounded-xl w-full shadow-lg p-4">
            {/* Başlık + madalyon — DİKEY istif (§105 tur 2): yatay grupta başlık metni
                kart ekseninden sağa kayıyordu; madalyon üstte, başlık altında → ikisi de
                detaylarla AYNI eksende. [&_svg]:mr-0: ikonun satır-içi mr-1'ini nötrler
                (daire merkezinden kaydırıyordu). */}
            <div className="flex flex-col items-center gap-2">
                {medallion && (
                    <div className="w-8 h-8 rounded-full bg-turf-600/15 border border-turf-600/30 flex items-center justify-center shrink-0 [&_svg]:mr-0">
                        {medallion}
                    </div>
                )}
                <p className="text-sm font-bold text-white leading-snug break-words min-w-0 text-center">
                    {titleText}
                </p>
            </div>

            {/* Detay satırları (saha / konum / tarih / saat ...) — MERKEZDE, ikon-metin
                dikey hizalı (items-center; SVG mr-1'i nötr, boşluk yalnız gap'ten) */}
            {detailLines.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                    {detailLines.map((line, i) => {
                        const token = tokenNameOf(line);
                        const icon = token ? getSystemIcon(token) : null;
                        const label = stripSystemMessageMarkers(line);
                        return (
                            <div key={i} className="flex items-center justify-center gap-2 px-2">
                                {icon && (
                                    <span className="shrink-0 flex items-center [&_svg]:mr-0">
                                        {icon}
                                    </span>
                                )}
                                <span className="text-sm text-slate-200 leading-snug break-words min-w-0">
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Alt not(lar) — SOLDA, ince ayraçla ayrılmış sönük bilgilendirme */}
            {footerText.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap text-left">
                    <SystemMessageRenderer text={footerText} />
                </div>
            )}

            {children}
        </div>
    );
};
