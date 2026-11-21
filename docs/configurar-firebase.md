# Conectar el Cancionero a Firebase (gratis)

Firebase guarda las canciones de cada iglesia en internet. El plan gratis (Spark) alcanza de sobra.
Proyecto en uso: **cancionero-leo1** (Firestore en `southamerica-west1`, Santiago).

## 1. Activar las dos formas de entrar
1. https://console.firebase.google.com → proyecto **cancionero-leo1**.
2. **Authentication** → pestaña **Sign-in method**.
3. **Agregar proveedor nuevo** → **Google** → **Habilitar** → elige tu correo de asistencia → **Guardar**.
4. **Agregar proveedor nuevo** → **Correo electrónico/contraseña** → solo el primer interruptor (**Habilitar**) → **Guardar**.
5. Pestaña **Configuración** → **Dominios autorizados** → agrega `leoriquelme.github.io`.

No se usa el ingreso anónimo ni PIN: cada persona entra con su cuenta.

## 2. Pegar las reglas
1. **Firestore Database** → pestaña **Reglas**.
2. Borra todo, pega el contenido de [`firestore.rules`](../firestore.rules) y toca **Publicar**.

Cada vez que cambien las reglas en este repositorio hay que volver a pegarlas.

## 3. Hacerte Super Admin
1. Entra a la app y abre `#/super`. Toca **Copiar código**.
2. En Firebase: **Firestore Database** → **Datos** → **+ Iniciar colección** → ID `superadmins`.
3. ID del documento: pega el código. Agrega un campo `nombre` (string) → **Guardar**.

## Cómo funcionan las iglesias
- Cualquiera con cuenta puede crear una iglesia (queda como **Administrador**) o unirse con el **código de acceso** o un link de invitación (entra como **Colaborador**).
- El Administrador sube a alguien a **Director musical** desde Miembros.
- Máximo 3 iglesias por persona.
