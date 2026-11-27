# Historial de cambios

Este documento resume qué incluye la versión actual del proyecto, las decisiones técnicas principales y lo que queda pendiente.

**Última actualización:** 27 de noviembre de 2026.

## MVP 0.1.0 — estado actual

Aplicación funcional para crear, editar, consultar y compartir cronogramas Gantt sin escribir código.

Licencia: PolyForm Noncommercial 1.0.0. El uso comercial requiere autorización.

### Base técnica final

- **Runtime:** Node.js 24 LTS.
- **Frontend:** React + TypeScript + Vite + Material UI.
- **Backend:** Express + TypeScript.
- **Base de datos:** SQLite con Prisma. No requiere servidor de base de datos.
- **Gantt:** renderer propio en SVG, sin dependencia de licencias PRO.
- **Autenticación:** JWT con usuario administrador; contraseña con bcrypt.
- **Persistencia:** cada cambio se guarda de inmediato; no hay un botón global de guardar.
- **Pruebas:** calendario laboral, programación de dependencias y parser/exportador PlantUML.

### Funcionalidad incluida

- Panel de proyectos con búsqueda, filtros, ordenamiento, estadísticas y estados.
- Crear, editar, duplicar, archivar y eliminar proyectos.
- Gantt diario, semanal y mensual con tabla fija de actividades.
- Zoom, ajuste a pantalla, ir a hoy y pantalla completa.
- Fases expandibles, actividades, subactividades, hitos y resúmenes visuales.
- Fechas inclusivas, duración en días laborables o naturales y calendario configurable.
- Fines de semana y festivos diferenciados; línea de hoy o fecha de referencia.
- Mover barras y redimensionarlas con el mouse, persistiendo las fechas.
- Avance, estados, prioridades, responsables, notas y colores personalizados.
- Dependencias Fin → Inicio con flechas, retraso, validación de ciclos y modos manual/automático.
- Reprogramación explícita de dependencias.
- Importación de PlantUML con previsualización, resumen y avisos.
- Exportación a PNG, SVG, PDF, Excel, CSV, JSON y PlantUML.
- Enlaces públicos de solo lectura con expiración, contraseña y revocación.
- Versiones guardadas (snapshots) consultables y descargables.
- Vista pública responsive con tabla ocultable.
- Cambio de contraseña desde el menú de usuario.

### Ajustes de UX posteriores al MVP

- **Tabla de actividades:** botón para ocultarla/mostrarla.
- **Ancho de la tabla:** se puede reducir arrastrando el borde derecho, desde 548 px hasta un mínimo de 460 px. No puede superar el ancho original. Doble clic restaura el tamaño y la preferencia se guarda en el navegador.
- **Modo mano:** botón en la barra del Gantt para activar el desplazamiento por arrastre y deshabilitar temporalmente la edición del diagrama.
- **Atajo Espacio:** con el cursor sobre el Gantt, mantener presionada la barra espaciadora activa el modo mano de forma temporal. Se bloquearon los eventos repetidos y el `keyup` para evitar el scroll de página. No se activa al escribir, con diálogos abiertos ni fuera del diagrama.

## Decisiones de arquitectura

La implementación final prioriza simplicidad, cero configuración y control del renderizado:

| Área | Implementación | Motivo |
|---|---|---|
| Backend | Express + TypeScript | Menor complejidad para el tamaño del MVP; la lógica está separada en servicios. |
| Base de datos | SQLite + Prisma | Arranque sin servidor, ideal para uso personal o equipos pequeños. |
| Gantt | SVG propio | Control del diseño, dependencias, festivos y exportación vectorial sin licencias PRO. |

## Pendientes y próximas etapas

- Usuarios, roles y miembros por proyecto (owner/editor/viewer).
- Restauración de versiones guardadas y comparación entre versiones.
- Deshacer/rehacer e historial de cambios detallado.
- Colaboración en tiempo real (WebSocket/SSE).
- Dependencias SS, FF y SF en la interfaz.
- Ruta crítica y línea base.
- Virtualización del Gantt para cientos de actividades.
- Notificaciones y recordatorios.
- Despliegue guiado con HTTPS y respaldos automáticos.

## Documentos relacionados

- [README](../README.md) — instalación, uso, despliegue y limitaciones.
- [ARQUITECTURA.md](ARQUITECTURA.md) — decisiones técnicas y modelo de datos.
- [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) — licencias de dependencias y tipografía.
