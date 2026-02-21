import axios from 'axios';

const API_BASE_URL = 'https://turkiyeapi.dev/api/v1';

export interface Province {
    id: number;
    name: string;
    area: number;
    population: number;
    altitude: number;
    areaCode: number[];
    isMetropolitan: boolean;
}

export interface District {
    id: number;
    name: string;
    area: number;
    population: number;
}

export const locationService = {
    async getProvinces(): Promise<Province[]> {
        try {
            const response = await axios.get(`${API_BASE_URL}/provinces?sort=name`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching provinces:', error);
            throw error;
        }
    },

    async getDistricts(provinceIdOrName: number | string): Promise<District[]> {
        try {
            // If it's a string, we might need to find the id first, but the API supports name too
            const identifier = typeof provinceIdOrName === 'string'
                ? encodeURIComponent(provinceIdOrName)
                : provinceIdOrName;

            const response = await axios.get(`${API_BASE_URL}/provinces?name=${identifier}`);
            if (response.data.data && response.data.data.length > 0) {
                return response.data.data[0].districts;
            }
            return [];
        } catch (error) {
            console.error('Error fetching districts:', error);
            throw error;
        }
    },

    async reverseGeocode(lat: number, lng: number): Promise<{ city: string; district: string } | null> {
        try {
            // Use Nominatim (OpenStreetMap) for reverse geocoding
            const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: {
                    'Accept-Language': 'tr-TR'
                }
            });

            if (response.data && response.data.address) {
                const addr = response.data.address;
                // In Turkey, Nominatim usually provides:
                // Province: province or city or state
                // District: town or city_district or suburb or district
                const city = addr.province || addr.city || addr.state || '';
                const district = addr.town || addr.city_district || addr.suburb || addr.district || '';

                return {
                    city: city.replace(' İlleri', '').replace(' İli', '').replace(' Büyükşehir Belediyesi', ''),
                    district: district.replace(' Belediyesi', '')
                };
            }
            return null;
        } catch (error) {
            console.error('Error in reverse geocoding:', error);
            return null;
        }
    }
};
