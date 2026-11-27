# Decisiones de arquitectura

Este documento explica por qué Cronograma Studio está construido así y qué implicaría llevarlo a una versión de más escala.

## 1. Monorepo con dos aplicaciones

```text
frontend/  SPA React
backend/   API REST + acceso a datos + generación/parseo PlantUML
```

El frontend compilado se sirve desde el propio backend en producción. Así el enlace compartido y el panel viven en el mismo origen, sin configurar CORS ni cookies cruzadas.

**Decisión:** Express + TypeScript en lugar de NestJS. El MVP tiene un dominio acotado (proyectos, actividades, calendario) y Express mantiene el arranque simple. La lógica sensible ya está separada en `calendar.ts`, `schedule.ts`, `plantuml.ts` y `projectService.ts`, por lo que una migración a NestJS reutilizaría esos servicios.

## 2. Base de datos

**Decisión:** SQLite con Prisma para desarrollo y despliegues pequeños.

Motivos:
- arranca sin instalar PostgreSQL;
- el archivo se respalda copiándolo;
- el modelo es relacional, no un JSON monolítico.

Limitaciones:
- un solo proceso de escritura a la vez;
- no hay tareas programadas ni búsqueda avanzada de PostgreSQL;
- los campos JSON (`holidays`, `sourcePlantUml`, snapshots) se guardan como cadenas para compatibilidad total con SQLite.

### Migrar a PostgreSQL

1. En `backend/prisma/schema.prisma`, cambiar:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Poner `DATABASE_URL="postgresql://usuario:password@host:5432/cronograma"`.
3. Generar una migración inicial (`npx prisma migrate dev --name init`).
4. Revisar los campos de fecha: hoy son cadenas `YYYY-MM-DD` a propósito. Pueden quedarse así o convertirse a `date` con una migración de datos.
5. Los campos JSON de festivos podrían pasar a tablas relacionales o a `Json` nativo.

## 3. Fechas sin zonas horarias

Todas las fechas de calendario viajan como texto `YYYY-MM-DD` y se manipulan con `Date.UTC(...)`.

Motivos:
- una actividad del 5 de octubre no debe cambiar de día al abrirla en otra zona horaria;
- el calendario laboral se define por fecha, no por instante.

Las marcas de auditoría (`createdAt`, `updatedAt`, `expiresAt`, `lastAccessedAt`) sí son `DateTime` reales.

**Semántica:**
- inicio y fin son inclusivos;
- la duración de una actividad se recalcula desde las fechas;
- la duración laborable cuenta solo días habilitados y no festivos;
- Fin → Inicio usa el siguiente día laborable después del fin de la predecesora.

## 4. Programación manual vs automática

- **Manual:** las fechas del usuario mandan. Las dependencias se muestran y se advierte si hay solapamiento, pero no se mueve nada.
- **Automático:** al guardar o mover una actividad, se recalcula la cadena de descendientes. Una actividad con predecesoras se alinea con ellas al guardarse. El botón «Reprogramar dependencias» recalcula todo el proyecto de forma explícita.

La lógica está en `backend/src/schedule.ts` y es independiente de la base de datos:
- detección de ciclos con DFS;
- orden topológico;
- cascada desde una actividad ancla;
- cálculo completo del proyecto.

Solo se programa FS. Los otros tipos (`SS`, `FF`, `SF`) existen en el modelo para no cerrar la puerta, pero la interfaz no los crea.

## 5. Gantt propio en SVG

Se evaluó SVAR React Gantt. La edición open source no cubre con suficiente control el diseño requerido (escala diaria densa, festivos, tabla fija, exportación vectorial, colores por actividad) y las funciones avanzadas son de pago.

**Decisión:** render propio.
- El calendario se construye como una sola capa SVG para las barras, flechas, bandas y línea de hoy.
- La tabla izquierda es HTML y queda fija con `position: sticky`.
- El desplazamiento horizontal y vertical comparte un único contenedor.
- El mismo modelo de filas y layout se usa para exportar SVG/PNG/PDF, de modo que la exportación no es una captura de pantalla de la interfaz.
- Arrastrar y redimensionar se traducen a fechas reales y se persisten en el backend.

Ventajas: control total y cero dependencias de licencia.
Costo: mantener el renderer. Para cientos de actividades conviene añadir virtualización de filas y render por viewport; hoy el layout es memoizado por escala/zoom y los proyectos de decenas de actividades son instantáneos.

## 6. Persistencia y guardado

No hay un botón «Guardar» global. Cada acción (crear actividad, editar, mover, eliminar, configuración) es una mutación inmediata contra la API y se refleja al invalidar la caché de TanStack Query. El indicador de la cabecera muestra «Guardando…»/«Guardado».

Esto evita el problema de perder cambios al cerrar. A cambio:
- no hay deshacer global;
- si la red falla, la mutación se informa y el cambio no se aplica;
- no hay control optimista de conflictos porque el MVP es de un usuario por proyecto.

## 7. Enlaces compartidos

- El token se genera con `crypto.randomBytes(24)`.
- Solo se guarda su hash SHA-256; el enlace completo se muestra **una vez** al crearlo.
- Se puede desactivar, revocar, poner expiración y contraseña (bcrypt).
- La ruta pública no usa autenticación y devuelve solo datos del cronograma, sin propietario, correo ni enlaces.
- El enlace público no permite mutaciones porque no existe ninguna ruta pública de escritura.
- `lastAccessedAt` se actualiza en cada lectura.

La URL se construye en el navegador con `window.location.origin`. Si la app se publica bajo HTTPS, los enlaces se generan con esa URL. Si se genera un enlace desde `localhost`, no servirá fuera de la máquina.

## 8. Importación PlantUML

`backend/src/plantuml.ts` es un parser de línea, no un evaluador. Reconoce:
- título, fecha de inicio, escala, idioma;
- cierre/apertura de días de la semana;
- separadores de fase;
- inicios explícitos y por dependencia;
- duración, porcentaje, color;
- fecha de referencia.

Resuelve fechas en cadena sin importar el orden de las líneas, informa de instrucciones desconocidas y conserva el texto original en `Project.sourcePlantUml`.

La exportación se genera desde el modelo. Si una dependencia no cabe en la sintaxis implementada, se emiten fechas explícitas y un comentario con la dependencia, en lugar de perder información.

## 9. Exportaciones

- **SVG/PNG/PDF:** el generador `frontend/src/features/gantt/exportSvg.ts` produce un SVG autónomo con título, tabla, calendario, barras, flechas y leyenda. PNG y PDF rasterizan ese SVG en el navegador. Así el PDF refleja el modelo y no la interfaz (sin botones ni menús).
- **Excel/CSV:** se construyen desde las mismas filas de actividades.
- **JSON/PlantUML:** los entrega el backend con autenticación.
- En la vista pública se ofrecen solo las exportaciones que se generan en el navegador; JSON/PlantUML requieren ser propietario.

## 10. Seguridad

Implementado:
- contraseñas con bcrypt;
- JWT de 30 días en `Authorization: Bearer`;
- todas las rutas privadas comprueban propiedad del proyecto;
- tokens públicos hasheados, revocables y con expiración;
- contraseñas de enlaces con bcrypt;
- límite de tamaño en importaciones (500 KB);
- Helmet con CSP, incluyendo `blob:` solo para las imágenes de exportación;
- validación de entrada con Zod;
- el frontend nunca recibe hashes ni códigos originales de otros usuarios.

Pendiente para producción abierta:
- rate limiting en login y enlaces con contraseña;
- HTTPS obligatorio (proxy);
- migrar Prisma CLI a 7.x para eliminar el aviso de auditoría (afecta a configuración y build, no a las rutas de la API);
- política de respaldo y rotación de `JWT_SECRET`;
- roles y miembros por proyecto;
- CSRF no aplica al usar tokens en cabecera, pero conviene revisar si se migra a cookies.

## 11. Próximos pasos sugeridos

1. Miembros y roles por proyecto (owner/editor/viewer).
2. Restaurar una versión guardada y comparar versiones.
3. Deshacer/rehacer con historial de acciones.
4. Reordenar por arrastre y mover actividades entre fases.
5. WebSockets o SSE para colaboración en vivo.
6. Virtualización del Gantt para cientos de actividades.
7. Dependencias SS/FF/SF y calendarios múltiples.
8. Distribución con PostgreSQL gestionado y almacenamiento de archivos para respaldos.
