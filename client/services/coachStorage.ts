// ─────────────────────────────────────────────────────────────────────────────
// Giriş ekranı yönlendirme katmanı (login coach, agent.md §106) bayrakları.
//
// localStorage (AnimatedSplash INTRO_SEEN deseni): senkron okuma, kaybolursa en
// kötü coach bir kez daha görünür — kozmetik, zararsız.
// Semantik (kullanıcı kararı): bayrak yalnız AKSİYON anında yazılır (vurgulu
// hedefe dokunma / boş alana dokunarak atlama) — aksiyonsuz kapanan uygulamada
// sonraki soğuk açılışta coach yeniden gösterilir.
// Giriş başarısı (AuthContext) iki bayrağı birden yazar → bu cihazda hesabına
// girmiş kullanıcı, sonradan çıkış yapsa bile coach'u hiç görmez.
// ─────────────────────────────────────────────────────────────────────────────

export type CoachId = 'login' | 'bizreg';

const KEYS: Record<CoachId, string> = {
    login: 'dimli_coach_login_done',
    bizreg: 'dimli_coach_bizreg_done',
};

function safeRead(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}

function safeWrite(key: string): void {
    try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
}

export function isCoachDone(id: CoachId): boolean {
    return safeRead(KEYS[id]) === '1';
}

export function markCoachDone(id: CoachId): void {
    safeWrite(KEYS[id]);
}

/** Giriş başarısında çağrılır: hesabı olan kullanıcı hiçbir coach'u görmez. */
export function markAllCoachDone(): void {
    (Object.keys(KEYS) as CoachId[]).forEach((id) => safeWrite(KEYS[id]));
}
