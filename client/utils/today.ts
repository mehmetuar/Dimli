// Yerel saate göre YYYY-MM-DD üretir. new Date().toISOString() UTC tabanlı olduğu
// için Türkiye (UTC+3) gece 00:00–03:00 arasında bir önceki günü döndürür; bu
// yardımcı her zaman cihazın yerel gününü verir. Tarihler YYYY-MM-DD string
// olduğundan leksikografik karşılaştırma = kronolojik karşılaştırma.
export const todayStr = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// base tarihine gün ekleyip yerel YYYY-MM-DD döndürür (örn. "Yarın" butonu).
export const addDaysStr = (base: Date, days: number): string => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
