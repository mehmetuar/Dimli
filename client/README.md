# Dimli — Mobil Uygulama (`client/`)

Dimli'nin React 19 + Capacitor 6 tabanlı iOS/Android uygulaması. **Yalnızca native mobil** olarak dağıtılır; web'de yayınlanmaz.

## Komutlar

```bash
npm install --legacy-peer-deps   # bağımlılıklar (capacitor-firebase peer uyarısı nedeniyle)
npm run dev                      # Vite dev server (:5173)
npm run build                    # Web build (Capacitor sync öncesi zorunlu)
npx cap sync                     # Web build'i native projelere kopyala
npx cap build ios                # Xcode'u aç
npx cap build android            # Android Studio'yu aç
```

## Yapı

- `pages/customer/` — kullanıcı ekranları, `pages/business/` — işletme ekranları. Her sayfa: `Xxx.tsx` (UI) + `hooks/useXxx.ts` (state/API) + `components/` (sayfaya özel bileşenler ve modallar).
- `components/Modals/` — yalnız **birden çok feature'ın paylaştığı** modallar. Tek sayfadan kullanılan modal o sayfanın `components/` klasöründe durur.
- `services/api.ts` — axios instance (Bearer interceptor); `services/authStorage.ts` — Capacitor Preferences ile oturum.
- `assets/dimli.png` + `assets/icon.png` — `scripts/generate-icons.cjs` için kaynak görseller (uygulama içi görseller `public/` altında).

Kalıcı kurallar ve mimari detaylar için repo kökündeki `CLAUDE.md` ve `agent.md`'ye bak.
