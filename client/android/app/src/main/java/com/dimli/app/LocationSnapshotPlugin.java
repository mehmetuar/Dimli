package com.dimli.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.location.Location;
import android.location.LocationManager;

import androidx.core.location.LocationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;

import java.util.List;

/**
 * §104 — Anında konum önbelleği + sağlayıcı durumu (yalnız Android).
 *
 * Neden var: @capacitor/geolocation v8 (ION 2.2.2) Android'de maximumAge'i önbellek
 * okuması olarak KULLANMAZ (yalnız fused getCurrentLocation'a tazelik ipucu; sonuç null
 * ise OS-PLUG-GLOC-0010). Eski davranıştaki "son bilinen konumu anında dön" yolu böylece
 * kayboldu. Bu mikro-plugin o yolu app tarafında geri getirir:
 *  - getLastKnown: önce GMS fused getLastLocation (her uygulamanın fix'ini taşıyan
 *    sistem önbelleği), yoksa framework LocationManager taraması; maxAgeMs filtresiyle.
 *  - getProviderStatus: "konum AÇIK ama ağ sağlayıcısı KAPALI" (Google Konum Doğruluğu
 *    kapatılmış) durumunun tespiti — kapalı mekânda GPS fix imkânsızken kullanıcıyı
 *    doğru ayara yönlendiren kartı besler.
 *
 * İzin: çağıran JS tarafı (LocationContext) yalnız izin granted iken çağırır;
 * SecurityException yine de yakalanıp reject edilir (savunma hattı).
 * iOS/web: plugin kayıtlı değil → JS köprüsü (utils/locationSnapshot.ts) sessizce null döner.
 */
@CapacitorPlugin(name = "LocationSnapshot")
public class LocationSnapshotPlugin extends Plugin {

    private static final long DEFAULT_MAX_AGE_MS = 30L * 60L * 1000L; // 30 dk

    @SuppressLint("MissingPermission") // JS izinden sonra çağırır; SecurityException yakalanır
    @PluginMethod
    public void getLastKnown(PluginCall call) {
        final long maxAgeMs = call.getLong("maxAgeMs", DEFAULT_MAX_AGE_MS);
        try {
            final FusedLocationProviderClient fused =
                    LocationServices.getFusedLocationProviderClient(getContext());
            fused.getLastLocation()
                    .addOnSuccessListener(location -> {
                        final Location best = freshest(location, frameworkLastKnown());
                        resolveOrReject(call, best, maxAgeMs);
                    })
                    .addOnFailureListener(e -> {
                        // GMS yok/hatalı → framework kemeri
                        resolveOrReject(call, frameworkLastKnown(), maxAgeMs);
                    });
        } catch (SecurityException e) {
            call.reject("PERMISSION_DENIED");
        } catch (Exception e) {
            // GMS sınıfları yok vb. → framework kemeri (o da SecurityException verebilir)
            try {
                resolveOrReject(call, frameworkLastKnown(), maxAgeMs);
            } catch (SecurityException se) {
                call.reject("PERMISSION_DENIED");
            }
        }
    }

    @PluginMethod
    public void getProviderStatus(PluginCall call) {
        final LocationManager lm =
                (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        final JSObject ret = new JSObject();
        if (lm == null) {
            ret.put("locationEnabled", false);
            ret.put("gps", false);
            ret.put("network", false);
            call.resolve(ret);
            return;
        }
        ret.put("locationEnabled", LocationManagerCompat.isLocationEnabled(lm));
        ret.put("gps", safeIsProviderEnabled(lm, LocationManager.GPS_PROVIDER));
        ret.put("network", safeIsProviderEnabled(lm, LocationManager.NETWORK_PROVIDER));
        call.resolve(ret);
    }

    // ── yardımcılar ──────────────────────────────────────────────────────────

    private static boolean safeIsProviderEnabled(LocationManager lm, String provider) {
        try {
            return lm.isProviderEnabled(provider);
        } catch (Exception e) {
            // sağlayıcı cihazda tanımsızsa IllegalArgumentException — kapalı say
            return false;
        }
    }

    @SuppressLint("MissingPermission")
    private Location frameworkLastKnown() {
        final LocationManager lm =
                (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return null;
        Location best = null;
        final List<String> providers = lm.getAllProviders();
        for (String provider : providers) {
            try {
                best = freshest(best, lm.getLastKnownLocation(provider));
            } catch (Exception ignored) {
                // tek sağlayıcı hatası taramayı durdurmasın
            }
        }
        return best;
    }

    private static Location freshest(Location a, Location b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.getTime() >= b.getTime() ? a : b;
    }

    private static void resolveOrReject(PluginCall call, Location location, long maxAgeMs) {
        if (location == null) {
            call.reject("NO_CACHED_LOCATION");
            return;
        }
        final long ageMs = Math.max(0, System.currentTimeMillis() - location.getTime());
        if (ageMs > maxAgeMs) {
            call.reject("NO_CACHED_LOCATION");
            return;
        }
        final JSObject ret = new JSObject();
        ret.put("latitude", location.getLatitude());
        ret.put("longitude", location.getLongitude());
        ret.put("accuracy", (double) location.getAccuracy());
        ret.put("ageMs", ageMs);
        call.resolve(ret);
    }
}
