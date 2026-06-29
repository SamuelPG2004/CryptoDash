# Manual de Usuario: CryptoDash 🚀

Bienvenido a **CryptoDash**, tu plataforma Full-Stack de gestión de activos digitales con seguridad institucional y una interfaz neón de vanguardia. Esta guía te proporcionará toda la información necesaria para utilizar la aplicación de manera efectiva.

## Índice
1. [Introducción](#introducción)
2. [Registro e Inicio de Sesión](#registro-e-inicio-de-sesión)
3. [Navegación Principal](#navegación-principal)
4. [Panel de Criptomonedas (Dashboard)](#panel-de-criptomonedas-dashboard)
5. [Conversor de Divisas](#conversor-de-divisas)
6. [Análisis de Mercado con IA](#análisis-de-mercado-con-ia)
7. [Noticias del Mercado](#noticias-del-mercado)
8. [Favoritos](#favoritos)
9. [Perfil y Configuración](#perfil-y-configuración)
10. [Seguridad](#seguridad)

---

## 1. Introducción
CryptoDash es una plataforma diseñada tanto para entusiastas principiantes como para traders experimentados. Permite visualizar el estado del mercado de criptomonedas en tiempo real, realizar conversiones, leer noticias relevantes y obtener análisis del mercado impulsados por Inteligencia Artificial (Gemini).

## 2. Registro e Inicio de Sesión

### Registro de Nueva Cuenta
Para utilizar CryptoDash, necesitas crear una cuenta:
1. Haz clic en **"Registrarse"** en la página de inicio.
2. Completa tus datos personales (Nombre, Correo Electrónico).
3. **Verificación de Edad:** Por normativas de seguridad e inversión, debes ser **mayor de 18 años** para registrarte. Se validará tu fecha de nacimiento.
4. **PIN de Seguridad:** Crea un PIN seguro. Este PIN se cifrará de extremo a extremo para garantizar la seguridad de tus operaciones.

### Inicio de Sesión
Si ya tienes cuenta:
1. Dirígete a la pestaña de **"Iniciar Sesión"**.
2. Ingresa tu correo electrónico y contraseña/PIN.
3. Al acceder, serás redirigido automáticamente a tu Dashboard principal.

## 3. Navegación Principal
En la parte superior de la aplicación encontrarás la **Barra de Navegación (Navbar)**, que te permite moverte entre las diferentes secciones:
- **Inicio/Dashboard:** Vista principal del mercado.
- **Favoritos:** Tus criptomonedas guardadas.
- **Perfil:** Ajustes de tu cuenta.
- **Cerrar Sesión:** Salir de la plataforma de forma segura.

## 4. Panel de Criptomonedas (Dashboard)
El corazón de CryptoDash es su tabla interactiva del mercado:
- **Listado en Tiempo Real:** Visualiza las principales criptomonedas (Bitcoin, Ethereum, etc.) con sus precios actualizados.
- **Tendencias:** Observa el cambio porcentual (positivo en verde, negativo en rojo).
- **Operaciones:** A través del **Trade Modal**, puedes simular la compra/venta de activos, gestionando tu portafolio virtual.
- **Marcar como Favorito:** Haz clic en el ícono de estrella junto a cualquier criptomoneda para añadirla a tu lista de vigilancia.

## 5. Conversor de Divisas
En el dashboard, encontrarás la herramienta de **Converter** (Conversor):
- Selecciona la criptomoneda de origen y la moneda fiat (ej. USD, EUR) o cripto de destino.
- Ingresa el monto a convertir.
- La plataforma calculará instantáneamente el valor basado en las tasas de cambio actuales del mercado.

## 6. Análisis de Mercado con IA
Gracias a la integración con inteligencia artificial avanzada (API de Gemini), CryptoDash te ofrece el **Market Analyzer**:
- **Insights Inteligentes:** Obtén resúmenes predictivos y análisis de sentimiento del mercado.
- **Tendencias:** La IA procesa los datos recientes y te da una perspectiva general de hacia dónde se dirige el mercado.
- *Nota: Los análisis son generados por IA y no constituyen consejo financiero.*

## 7. Noticias del Mercado
Mantente informado sin salir de la plataforma con el **News Panel**:
- Se recopilan las noticias más recientes e impactantes del ecosistema cripto a través de fuentes RSS.
- Las noticias se actualizan automáticamente para que no te pierdas ningún evento importante que pueda afectar los precios.

## 8. Favoritos
En la pestaña de **Favoritos** (`/favorites`), puedes:
- Ver exclusivamente las monedas que has marcado con la estrella.
- Monitorear más de cerca tus activos preferidos sin el ruido de todo el mercado.
- Acceder rápidamente a opciones de compra/venta o análisis de estos activos específicos.

## 9. Perfil y Configuración
Accediendo a tu **Perfil** (`/profile`), tienes control sobre tu cuenta:
- **Datos Personales:** Visualiza y actualiza tu información básica.
- **Gestión de Portafolio:** Revisa el historial de tus operaciones simuladas y tu balance actual.
- **Preferencias:** CryptoDash es multi-idioma. Puedes ajustar el idioma de la interfaz según tus preferencias.

## 10. Seguridad
Tu seguridad es nuestra prioridad. CryptoDash implementa:
- **Cifrado de Extremo a Extremo:** Tus contraseñas y PINs son hasheados utilizando `bcryptjs` antes de ser almacenados en la base de datos (MongoDB).
- **Sesiones Seguras:** Utilizamos JSON Web Tokens (JWT) para asegurar que tu sesión de usuario no pueda ser interceptada ni suplantada.
- **Protección contra Ataques:** La plataforma incluye `helmet` y limitadores de tasa (`express-rate-limit`) para prevenir ataques de denegación de servicio (DDoS) y ataques de fuerza bruta.

---

*¡Gracias por elegir CryptoDash! Explora el mercado, analiza con inteligencia y gestiona tus activos con la mejor interfaz del ecosistema web.*
