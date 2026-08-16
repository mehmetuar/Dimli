import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

// Uygulama detay ekranı — İZİN sorunları için (izin anahtarı orada)
export const openLocationSettings = async () => {
    await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.App,
    });
};

// Konum ANA ayar ekranı — konum servisi / Google Konum Doğruluğu (ağ sağlayıcısı)
// anahtarları orada (§104: network_location_off kartı bunu açar)
export const openLocationServiceSettings = async () => {
    await NativeSettings.open({
        optionAndroid: AndroidSettings.Location,
        optionIOS: IOSSettings.App,
    });
};
