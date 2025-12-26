export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Number(d.toFixed(1));
};

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                () => {
                    reject(new Error('Unable to retrieve your location'));
                }
            );
        }
    });
};

export const ISTANBUL_DISTRICTS = [
    { name: 'Kadıköy', lat: 40.9819, lng: 29.0256 },
    { name: 'Beşiktaş', lat: 41.0422, lng: 29.0067 },
    { name: 'Üsküdar', lat: 41.0260, lng: 29.0170 },
    { name: 'Şişli', lat: 41.0536, lng: 28.9774 },
    { name: 'Maltepe', lat: 40.9254, lng: 29.1309 },
    { name: 'Ataşehir', lat: 40.9850, lng: 29.1240 },
    { name: 'Beykoz', lat: 41.1186, lng: 29.0950 }
];
