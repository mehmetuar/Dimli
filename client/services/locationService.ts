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
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                console.warn('Google Maps API key is missing');
                return null;
            }

            const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=tr`);

            if (response.data && response.data.results && response.data.results.length > 0) {
                const results = response.data.results;
                
                let city = '';
                let district = '';

                // Look through the address components of the first result (usually the most specific)
                for (const component of results[0].address_components) {
                    const types = component.types;
                    
                    // In Turkey, administrative_area_level_1 is the province (city)
                    if (types.includes('administrative_area_level_1')) {
                        city = component.long_name;
                    }
                    
                    // In Turkey, administrative_area_level_2 is usually the district
                    // Sometimes locality or sublocality is used depending on the region
                    if (types.includes('administrative_area_level_2') || types.includes('locality')) {
                        // Don't overwrite if we already found level_2 and this is locality
                        if (!district || types.includes('administrative_area_level_2')) {
                            district = component.long_name;
                        }
                    }
                }

                // Cleanup common suffixes like "İli", "Büyükşehir Belediyesi" if they exist
                if (city) {
                    city = city.replace(' İlleri', '').replace(' İli', '').replace(' Büyükşehir Belediyesi', '');
                }
                
                if (district) {
                    district = district.replace(' Belediyesi', '').replace(' İlçesi', '');
                }

                if (city || district) {
                    return { city, district };
                }
            }
            return null;
        } catch (error) {
            console.error('Error in reverse geocoding:', error);
            return null;
        }
    }
};
