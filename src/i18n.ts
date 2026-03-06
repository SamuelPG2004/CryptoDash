import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "cryptoDash": "CRYPTO",
            "dash": "DASH",
            "favorites": "Favorites",
            "profile": "Profile",
            "logout": "Log Out",
            "login": "Log In",
            "register": "Register",
            "marketTicker": "Live Market",
            "heroTitle1": "DOMINATE THE",
            "heroTitle2": "MARKET",
            "heroTitle3": "digital.",
            "heroDesc": "Accurate data, instant news and advanced technical analysis to empower your crypto investments.",
            "createAccount": "Create Account",
            "viewMarkets": "View Markets",
            "leadingAssets": "Leading Assets",
            "leadingAssetsDesc": "Real-time global synchronization"
        }
    },
    es: {
        translation: {
            "cryptoDash": "CRYPTO",
            "dash": "DASH",
            "favorites": "Favoritos",
            "profile": "Perfil",
            "logout": "Cerrar Sesión",
            "login": "Iniciar Sesión",
            "register": "Registrarse",
            "marketTicker": "Mercado en Vivo",
            "heroTitle1": "DOMINA EL",
            "heroTitle2": "MERCADO",
            "heroTitle3": "digital.",
            "heroDesc": "Datos precisos, noticias al instante y análisis técnico avanzado para potenciar tus inversiones en criptoactivos.",
            "createAccount": "Crear Cuenta",
            "viewMarkets": "Ver Mercados",
            "leadingAssets": "Activos Líderes",
            "leadingAssetsDesc": "Sincronización global en tiempo real"
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'es',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
