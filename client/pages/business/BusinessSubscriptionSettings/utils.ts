import { Capacitor } from '@capacitor/core';
import { SUBSCRIPTION_PLANS } from '../BusinessRegister/hooks/useBusinessRegister';

export const formatPrice = (price: number) =>
    new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price);

export const PLAN_ENTRIES = Object.entries(SUBSCRIPTION_PLANS).sort(
    ([a], [b]) => Number(a) - Number(b),
);

export const openStoreSubscriptions = () => {
    const platform = Capacitor.getPlatform();
    const url =
        platform === 'ios'
            ? 'itms-apps://apps.apple.com/account/subscriptions'
            : 'https://play.google.com/store/account/subscriptions';
    window.open(url, '_system');
};
