import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const stationId = localStorage.getItem('selectedStation');
        if (stationId) {
            config.headers['x-station-id'] = stationId;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.message || 'Une erreur inattendue est survenue.';

        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('selectedStation');
            window.location.href = '/';
        } else if (error.response?.status >= 400) {
            toast.error(Array.isArray(message) ? message[0] : message);
        } else {
            toast.error('Erreur de connexion au serveur.');
        }

        return Promise.reject(error);
    }
);
