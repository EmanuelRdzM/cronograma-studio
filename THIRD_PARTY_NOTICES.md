# Licencias de terceros

Cronograma Studio usa librerías de código abierto. Este archivo reúne sus licencias para que quede claro qué cubre la licencia del proyecto y qué hay que conservar si se redistribuye una copia.

PolyForm Noncommercial 1.0.0 (ver [LICENSE](LICENSE)) se aplica al código propio. Cada dependencia conserva la suya.

Las versiones exactas están en `package-lock.json`. Última revisión: 27 de noviembre de 2026.

## Frontend

| Componente | Licencia | Uso |
|---|---|---|
| React / React DOM | MIT | Interfaz |
| React Router | MIT | Navegación |
| TanStack Query | MIT | Estado y caché de datos |
| Material UI y MUI Icons | MIT | Componentes e iconos |
| Emotion | MIT | Estilos |
| React Hook Form | MIT | Formularios |
| Hookform Resolvers | MIT | Validación de formularios |
| Zod | MIT | Validación de datos |
| jsPDF | MIT | Exportación PDF |
| ExcelJS | MIT | Exportación Excel |
| Fontsource Inter | OFL-1.1 | Tipografía |

## Backend

| Componente | Licencia | Uso |
|---|---|---|
| Express | MIT | API HTTP |
| Helmet | MIT | Cabeceras de seguridad |
| CORS | MIT | Control de origen |
| JSON Web Token | MIT | Autenticación |
| bcryptjs | BSD-3-Clause | Hash de contraseñas |
| dotenv | BSD-2-Clause | Variables de entorno |
| Zod | MIT | Validación |
| Prisma Client | Apache-2.0 | Acceso a datos |
| Prisma CLI | Apache-2.0 | Migraciones, seed y generación |

## Dependencias indirectas

La mayoría usa MIT, ISC o Apache-2.0. Estas son las que tienen condiciones o licencias menos habituales:

| Componente | Licencia | Nota |
|---|---|---|
| Prisma Engines | Apache-2.0 | Motores de Prisma |
| DOMPurify | MPL-2.0 OR Apache-2.0 | Se distribuye bajo Apache-2.0 |
| JSZip | MIT OR GPL-3.0-or-later | Se utiliza la opción MIT |
| html2canvas | MIT | Dependencia de jsPDF |
| fast-png / pako | MIT AND Zlib | Dependencias de jsPDF |
| big-integer | Unlicense | Dependencia transitiva |
| graceful-fs | BlueOak-1.0.0 | Dependencia transitiva |
| rgbcolor | MIT OR FEEL-FREE | Se utiliza la opción MIT |
| chainsaw | MIT/X11 | Dependencia de ExcelJS para Node |
| uuid | MIT | Dependencia de ExcelJS |
| buffers | Sin licencia declarada | Ver nota siguiente |

ExcelJS incluye `buffers@0.1.1` en su rama para Node y ese paquete no declara licencia. En este proyecto ExcelJS solo se carga en el navegador para generar el `.xlsx` (import dinámico en `ExportDialog`), así que esa rama no se distribuye. Si algún día se usa ExcelJS en el backend, conviene revisar ese punto.

## Node.js y la imagen Docker

El backend corre sobre Node.js, que usa licencia MIT. La imagen parte de `node:24.22.3-bookworm-slim`, así que también incluye Node y librerías del sistema Debian. Los avisos de esas librerías están dentro de la imagen (`/usr/share/doc`) y cambian con cada actualización de la imagen; no tiene sentido copiarlos todos aquí.

## Herramientas de desarrollo

Vite, TypeScript, Vitest, tsx, Prisma CLI, browserslist y otras herramientas de compilación no forman parte del paquete que se sirve al navegador. Conservan sus propias licencias.

`caniuse-lite` (CC-BY-4.0) es una dependencia de herramientas de compilación y no se incluye en el código en ejecución.

## Notas

- No hay dependencias GPL o AGPL obligatorias en el código que se distribuye.
- Las dependencias con doble licencia se usan en su opción permisiva: DOMPurify bajo Apache-2.0, JSZip bajo MIT y rgbcolor bajo MIT.
- La tipografía Inter se distribuye bajo SIL Open Font License 1.1. El texto completo va abajo porque la licencia exige que acompañe a los archivos de la fuente.
- Si distribuyes una versión compilada, conserva este archivo y los textos de licencia que vienen dentro de cada paquete.

Los textos completos de las licencias MIT, ISC, BSD, Apache-2.0, BlueOak, Unlicense y OFL están incluidos en los paquetes correspondientes dentro de `node_modules` y en sus repositorios originales.

## SIL Open Font License 1.1 — Inter

Copyright 2016 The Inter Project Authors (<https://github.com/rsms/inter>)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
<http://scripts.sil.org/OFL>

```text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
