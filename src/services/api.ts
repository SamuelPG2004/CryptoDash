import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// Mejorar manejo de errores para mostrar detalles de error 500
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 500) {
      // Mostrar detalles del error del backend
      console.error('Error 500 del servidor:', error.response.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
