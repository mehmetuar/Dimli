import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

export const openLocationSettings = async () => {
    await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.App,
    });
};
