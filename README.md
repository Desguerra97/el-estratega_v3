# Laboratorio de Ideas CUN — El Estratega

## Versión 2.1.0
Esta versión reemplaza la narrativa anterior por una historia continua y natural de Samuel: cada nivel nace de la decisión tomada en el anterior y conduce al siguiente. El nombre del juego es **El Estratega**.

## Versión 2.0.0
Esta versión incorpora:
- progreso, mejores puntajes y estrellas aislados por correo institucional;
- mapa/progreso visual con la evolución de la armadura;
- sistema de 1–3 estrellas por nivel;
- insignias de aprendizaje;
- combo visible durante Diamond Rush;
- timeout con pérdida de vida y ventana adicional de 20 segundos;
- rúbricas específicas por nivel para la evaluación IA;
- cierre del nivel 9 orientado a ventaja competitiva, cadena de valor y resumen ejecutivo;
- estructura ZIP normalizada con rutas `/` para despliegues web.

### Nota de seguridad
El endpoint de Google Apps Script sigue siendo visible desde el frontend. Si la puntuación afecta una calificación oficial, el backend debe validar límites, niveles, duración y duplicados. El hash del cliente no debe considerarse una medida criptográfica.

# 🐍 El Estratega CUN

> Juego educativo tipo Snake para reforzar los conceptos de **Administración Estratégica** basado en el libro de Fred R. David (9ª edición). Diseñado para el curso de Administración Estratégica de la Corporación Unificada Nacional (CUN).

![Estado](https://img.shields.io/badge/estado-listo%20para%20jugar-brightgreen)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-success)

---

## 🎯 ¿Qué es?

Los estudiantes juegan una **culebrita clásica** desde el navegador, pero en lugar de comer manzanas, deben comer **conceptos correctos** según la pregunta que aparece en la parte superior. Cada capítulo tiene 10 preguntas → 10 niveles progresivos.

- 🧠 **90 preguntas** cubriendo los 9 capítulos del curso
- 🏆 **Ranking Top 10** público con seudónimos
- 📊 **Resultados en Google Sheets** en tiempo real (sin backend propio)
- 🎁 **Hasta +2 puntos de bonificación** sobre la nota del ACA
- 💻 **100% en el navegador**, sin instalación
- 🆓 **Hosting gratis en GitHub Pages**

---

## 🏰 Mecánica de exploración y rompecabezas

La versión actual toma como referencia la lógica de los juegos clásicos de exploración y rompecabezas de aventura, sin copiar personajes, mapas ni recursos propietarios. El tablero ya no funciona como un laberinto tipo Pac-Man: cada nivel combina **rutas, obstáculos, decisiones y riesgos**.

- 🪨 **Rocas empujables** para abrir o bloquear caminos.
- 🏰 **Puertas del conocimiento** que se abren respondiendo preguntas específicas del capítulo.
- 🔥 **Trampas de fuego y lanzas**: una respuesta correcta permite desactivarlas; fallar cuesta una vida.
- 🧰 **Cofres** con preguntas y recompensas de puntos o poderes.
- ⚑ **Puntos de control** desde el nivel 3 para reaparecer después de recibir daño.
- 🐍 **Enemigos con comportamientos distintos**: patrulla, movimiento aleatorio y persecución.
- 👑 **Guardián final en el nivel 9**, que exige tres respuestas correctas para derrotarlo.
- 📖 **Lecturas con preguntas** que entregan poderes como dinamita, turbo y escudo.
- 💎 Los conceptos correctos siguen siendo la colección principal: completar la colección abre la salida.

Las preguntas utilizadas por las puertas, cofres, trampas, enemigos y libros provienen de `data/levels.json`, por lo que cada nivel mantiene su relación directa con el tema académico.

## 🎮 Mecánica del juego

1. El estudiante ingresa con su **nombre + email @cun.edu.co**
2. Elige un capítulo (o modo "aleatorio de los 9")
3. En cada nivel aparece una pregunta arriba (ej: *"Come solo las OPORTUNIDADES externas"*)
4. En el tablero flotan **conceptos** dorados:
   - Comer uno **correcto** → +10 pts, la culebra crece
   - Comer uno **incorrecto** → -5 pts, pierde una vida
5. Al comer todos los correctos → siguiente nivel (siguiente pregunta)
6. Tiene **3 vidas** y **60 segundos por nivel**
7. Al finalizar, el puntaje se envía **automáticamente** a la hoja del docente

---

## 💰 Sistema de bonificación

| Puntaje acumulado | Bonus en ACA |
|---|---|
| 0 - 499 | +0.0 |
| 500 - 999 | +0.5 |
| 1000 - 1499 | +1.0 |
| 1500 - 1999 | +1.5 |
| 2000+ | +2.0 |

**Editable** en `data/config.json` → sección `bonificacion_aca`.

Se cuenta el **mejor puntaje** acumulado del estudiante a lo largo de las 3 semanas.

---

## 🚀 Puesta en marcha (docente)

### Paso 1: Crea tu Google Sheet backend

📖 Instrucciones detalladas en [`docs/SETUP_GOOGLE_SHEETS.md`](docs/SETUP_GOOGLE_SHEETS.md)

Resumen rápido:
1. Crea una hoja nueva en Google Drive
2. Extensiones → Apps Script → pega `google-apps-script/Code.gs`
3. Implementar → Aplicación web → "Cualquier persona" → copia la URL

### Paso 2: Configura el juego

Edita `data/config.json`:

```json
{
  "google_sheets_endpoint": "https://script.google.com/macros/s/AKfycb.../exec"
}
```

### Paso 3: Publica en GitHub Pages

📖 Instrucciones en [`docs/DEPLOY_GITHUB_PAGES.md`](docs/DEPLOY_GITHUB_PAGES.md)

Resumen:
1. Sube el repo a tu GitHub
2. Settings → Pages → Source: main branch → root
3. Espera 1-2 min y comparte la URL con tus estudiantes

### Paso 4: Comparte con los estudiantes

Envía por Moodle:
- **URL del juego** (algo como `https://tuusuario.github.io/strategic-snake-cun/`)
- **Fecha límite** (3 semanas antes del ACA)
- **Instrucciones** de [`docs/COMO_JUGAR.md`](docs/COMO_JUGAR.md)

---

## 📊 Cómo consultar resultados (docente)

Abre tu Google Sheet — verás 2 pestañas:

- **Resultados**: cada partida como una fila (timestamp, nombre, email, puntaje, aciertos, errores, bonus)
- **Mejores**: consolidado por estudiante con su mejor puntaje y bonus final

Para calcular la bonificación final:
1. Filtra por fecha (últimas 3 semanas)
2. Descarga como XLSX (Archivo → Descargar → Excel)
3. Cruza el email con tu lista oficial del ACA
4. Suma la columna `bonus_aca` a la nota final

---

## 📁 Estructura del proyecto

```
strategic-snake-cun/
├── index.html                      # Entrada principal
├── styles/
│   └── main.css                    # Estilos con paleta CUN
├── game/
│   ├── snake.js                    # Motor Snake (Canvas)
│   ├── content-loader.js           # Carga JSON de datos
│   ├── sheets-sender.js            # Envío a Google Sheets
│   └── ui.js                       # Controlador de pantallas
├── data/
│   ├── config.json                 # Configuración editable
│   └── questions.json              # 90 preguntas
├── google-apps-script/
│   └── Code.gs                     # Backend de Sheets
├── docs/
│   ├── SETUP_GOOGLE_SHEETS.md      # Guía Sheets
│   ├── COMO_JUGAR.md               # Guía estudiantes
│   └── DEPLOY_GITHUB_PAGES.md      # Guía deploy
├── LICENSE
└── README.md
```

---

## 🛠️ Personalización

### Cambiar preguntas
Edita `data/questions.json`. Cada pregunta tiene:
```json
{
  "id": "1.1",
  "instruccion": "Come solo las OPORTUNIDADES externas",
  "correctos": ["crecimiento del sector", "nueva tecnología"],
  "incorrectos": ["marca propia", "deuda alta"]
}
```

### Cambiar umbrales de bonificación
Edita `data/config.json` → `bonificacion_aca` array.

### Cambiar dificultad
Edita `data/config.json` → `juego`:
- `speed_ms_inicial`: menor = más rápido (ms entre movimientos)
- `vidas`: cantidad de intentos por partida
- `tiempo_por_nivel_seg`: segundos para completar cada nivel

---

## 🔒 Anti-fraude básico

- Los envíos incluyen un **hash** derivado del email+puntaje (evita POST manuales triviales)
- **Rate limit** de 30 segundos entre envíos del mismo email/puntaje
- Validación de **dominio institucional** (@cun.edu.co) al registrarse
- Los estudiantes solo ven ranking con **seudónimos**, no nombres reales

---

## 📖 Créditos

- **Contenido teórico**: Fred R. David, *Conceptos de Administración Estratégica*, 9ª ed., Pearson-Prentice Hall (2003)
- **Diseño e implementación**: para el curso de Administración Estratégica CUN, semestre 2026
- **Framework**: HTML5 Canvas + JavaScript vanilla (sin dependencias)

---

## 📜 Licencia

MIT — libre uso académico y personal. Ver [`LICENSE`](LICENSE).

## Actualización v9 — Rompecabezas, jaulas y explorador

- Cada nivel tiene un **rompecabezas central** compuesto por mecanismos/sellos. Las preguntas del tema sirven como llaves de conocimiento.
- La **puerta de salida permanece cerrada** hasta activar todos los mecanismos. Los conceptos recogidos funcionan como pistas y recompensas, no como requisito único de salida.
- Los enemigos verdes que persiguen al jugador empiezan **encerrados en jaulas**. Una trampa del escenario está vinculada a cada jaula; al activarla, el perseguidor queda libre.
- El inicio de cada nivel tiene una **zona segura** sin enemigos, trampas ni objetos peligrosos para que el jugador pueda observar y pensar antes de exponerse.
- El protagonista ya no es una bolita: se representa como un **aventurero pixel-art genérico**, con piernas, brazos, gorra y animación de caminata.
- Se mantiene la integración de preguntas académicas, cofres, rocas, checkpoints, poderes y jefe final.
