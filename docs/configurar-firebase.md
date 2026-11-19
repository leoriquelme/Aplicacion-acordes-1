# Conectar el Cancionero a Firebase (gratis)

Firebase guarda las canciones de cada iglesia en internet. El plan gratis (Spark) alcanza de sobra.

## 1. Crear el proyecto
1. Entra a https://console.firebase.google.com con tu cuenta de Google.
2. **Agregar proyecto** → nombre `cancionero-leo1` (el que usamos) → desactiva Google Analytics → **Crear proyecto**.

## 2. Activar el ingreso
1. Menú izquierdo: **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso** → **Anónimo** → activar → **Guardar**.
   (La persona no ve nada de esto: solo escribe iglesia y nombre.)
3. Pestaña **Configuración → Dominios autorizados → Agregar dominio** → `leoriquelme.github.io`.

## 3. Crear la base de datos
1. **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: `southamerica-west1 (Santiago)` → **Comenzar en modo de producción** → **Crear**.
3. Pestaña **Reglas**: borra todo, pega el contenido de [`firestore.rules`](../firestore.rules) → **Publicar**.

## 4. Registrar la iglesia PSG
En **Firestore Database → Datos → Iniciar colección**:
- ID de la colección: `churches`
- ID del documento: `psg`
- Campos (todos de tipo *string*):
  - `name` = `PSG`
  - `adminKey` = tu nombre en minúsculas, sin tildes, con un solo espacio. Ej.: `leonardo riquelme`
  - `adminPin` = tu PIN de administrador: **solo números y al menos 8** (con menos, las reglas no te dejan entrar)

Opcional, pero recomendado: después de entrar, ve a **Mi iglesia** y activa un **código de acceso**
para que solo entren los que lo conocen.

Para agregar otra iglesia más adelante se repite este paso con otro documento
(el ID es el nombre de la iglesia en minúsculas, sin tildes).

## 5. Conectar la app
1. Ícono ⚙ → **Configuración del proyecto → General → Tus apps** → ícono `</>` (Web).
2. Apodo `cancionero` → **Registrar app** (sin Hosting).
3. Copia el bloque `const firebaseConfig = { ... }` en `src/firebase-config.js`.
   Estos datos no son secretos: la seguridad la dan las reglas del paso 3.

## Seguridad (lo que hacen las reglas)
- Un nombre de **Director** o **Administrador** solo entra con su PIN. Nadie puede escribir tu nombre
  y entrar como Colaborador para ver tus notas.
- Los PIN deben tener **8 números o más** (uno de 4 se adivina probando).
- Si cambias un PIN, un perfil o el código de acceso, las personas afectadas tienen que volver a entrar.
- Cada vez que cambie `firestore.rules`, hay que volver a pegarlo en **Firestore → Reglas → Publicar**.

## Inicio con Google, iglesias nuevas y Super Admin (19-nov-2026)

1. Firebase Console → **Authentication** → **Sign-in method** → **Agregar proveedor nuevo** → **Google** → Habilitar → elegir correo de asistencia → Guardar.
2. Authentication → **Configuración** → **Dominios autorizados** → Agregar dominio → `leoriquelme.github.io`.
3. Pegar `firestore.rules` en Firestore → Reglas → Publicar.
4. Abrir la app en `#/super`, entrar con Google y copiar el código que aparece.
5. Firestore → Datos → Iniciar colección `superadmins` → ID del documento = ese código → un campo `nombre` (texto) → Guardar.

- Las iglesias nuevas las crea cualquiera con cuenta de Google (máx. 3 por cuenta) y quedan activas al tiro. El id es el nombre normalizado (`keyOf`), así no hay dos con el mismo nombre.
- El campo `adminPin` puede renombrarse a `adminPassword` (las reglas aceptan los dos; si están ambos, vale `adminPassword`).
