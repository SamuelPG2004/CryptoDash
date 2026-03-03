# CryptoDash 🚀

Plataforma Full-Stack de gestión de activos digitales con seguridad institucional y una interfaz neón de vanguardia.

## ✨ Características
* **Seguridad:** Registro validado para mayores de 18 años y cifrado de PIN.
* **Tecnología:** Desarrollado con el stack MERN (MongoDB, Express, React, Node.js).
* **Interfaz:** Diseño dark-mode optimizado con Tailwind CSS.

## 🛠️ Instalación
1. git clone https://github.com/SamuelPG2004/CryptoDash.git
2. cd CryptoDash
3. npm install

### 📁 Configurar variables de entorno
Copia el archivo de ejemplo y completa tus credenciales:

```bash
cp .env.example .env
# o en Windows PowerShell:
# copy .env.example .env
```
Luego edita `.env` ajustando al menos estas claves:

```env
MONGODB_URI=<tú cadena de conexión MongoDB>
JWT_SECRET=<una clave secreta para JWT>
GEMINI_API_KEY=<si usas la API de Gemini>
APP_URL=http://localhost:3000   # sólo necesario para integración externa
```

> **Nota:** `.env` está en `.gitignore` para que tus secretos no se suban al repositorio.

### 🔄 Ejecutar en desarrollo
```bash
npm run dev
```
El backend y Vite estarán disponibles en http://localhost:3000.

### 🚀 Producción local
Primero genera el build estático y luego inicia el servidor con la variable de entorno adecuada:
```bash
npm run build
npm start
```
El servidor utiliza `PORT` si se define, de lo contrario `3000`.

### 📦 Despliegue a Vercel
La aplicación ya está preparada para funcionar en Vercel. El archivo `vercel.json` configura dos builds
(uno para la API/servidor y otro para los activos estáticos) y rutas para enrutar `/api/*` a `server.ts`.

1. Crea un nuevo proyecto en Vercel y vincúlalo al repositorio.
2. En el panel de **Settings › Environment Variables**, añade
   - `MONGODB_URI` (con tu cadena de MongoDB Atlas)
   - `JWT_SECRET` (secreto para tokens)
   - `GEMINI_API_KEY` (si lo necesitas)
   - `APP_URL` (la URL que Vercel te asigne)
3. No es necesario establecer `NODE_ENV`; Vercel lo hace automáticamente.
4. El despliegue se disparará con cada `git push`.

Una vez desplegado, todas las rutas front‑end se servirán desde la carpeta `dist` y los endpoints
`/api/...` serán manejados por el servidor Express exportado desde `server.ts`.
