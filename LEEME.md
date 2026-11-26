# Santa Secreto – cómo activar las salas entre dispositivos

GitHub Pages solo aloja archivos, no guarda datos. Para que varios celulares compartan la sala se usa Firebase (gratis).

1. Entra a https://console.firebase.google.com con tu cuenta de Google y pulsa **Crear un proyecto** (puedes desactivar Analytics).
2. En el menú **Compilación → Firestore Database** pulsa **Crear base de datos**. Elige cualquier ubicación y empieza en **modo de producción**.
3. En la pestaña **Reglas** pega esto y pulsa **Publicar**:

       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /rooms/{document=**} {
             allow read, write: if true;
           }
         }
       }

4. En **Configuración del proyecto (⚙️) → Tus apps** pulsa el icono web `</>`, ponle un nombre y copia el objeto `firebaseConfig`.
5. Pega esos valores en `js/firebase-config.js` (apiKey, authDomain, projectId, appId).
6. Sube los archivos a GitHub y espera 1 o 2 minutos a que se actualice la página.

Las reglas son abiertas: cualquiera que tenga la página puede leer y escribir en `rooms`. Para un juego entre amigos está bien. No guardes nada sensible.
