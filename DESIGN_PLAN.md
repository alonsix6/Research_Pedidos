# MEGA PLAN: Dashboard Teenage Engineering K.O. II Style

## Investigacion y Analisis

### Fuentes de Investigacion

- [Teenage Engineering Design Philosophy](https://medium.com/@ihorkostiuk.design/the-product-design-of-teenage-engineering-why-it-works-71071f359a97)
- [Teenage Engineering Color Palette](https://www.color-hex.com/color-palette/1057593)
- [DSEG Seven Segment Fonts](https://www.keshikan.net/fonts-e.html)
- [Josh W. Comeau 3D Buttons](https://www.joshwcomeau.com/animation/3d-button/)
- [Neumorphism Generator](https://neumorphism.io/)

### Elementos Clave del K.O. II (EP-133)

Analizando las imagenes proporcionadas, identifico estos elementos distintivos:

```
+--------------------------------------------------+
|  OUTPUT   [INPUT]   SYNC  MIDI      USB   POWER  |  <- Barra superior con puertos
+--------------------------------------------------+
|                                                  |
|  K.O. II                          [SPEAKER      |  <- Branding + Grille
|  サンプラー                          GRILLE]      |
|  64 MB SAMPLER COMPOSER                          |
|                                                  |
|  +------------------------------------------+    |
|  |  [A] [SYNC]        BAR                   |    |  <- PANTALLA LCD SEGMENTADA
|  |  [B] [●]    19.3   [WAVEFORM]   [STEREO] |    |     con iconos pixelados
|  |  [C] [D] [SOUND]  ▶  [FX] [■]   [Q]      |    |
|  +------------------------------------------+    |
|                                                  |
|  (VOLUME)  [SOUND] [MAIN]  [TEMPO]    (BPM) (Y)  |  <- Knobs + Botones
|            [EDIT]  [COMMIT] [LOOP]               |
|                                                  |
|  [KEYS]  [A] [7] [8] [9]  [SAMPLE] [TIMING]     |  <- Grid de botones
|  [FADER] [B] [4] [5] [6]  [FX]     [ERASE]      |     estilo calculadora
|    |     [C] [1] [2] [3]  [OUTPUT] [SYSTEM]     |
|    |     [D] [.] [0] [ENTER] [REC] [PLAY]       |
|  [SHIFT]         [-]  [+]                        |
+--------------------------------------------------+
```

---

## 1. PALETA DE COLORES AUTENTICA

### Colores Principales (extraidos del K.O. II)

```css
:root {
  /* Cuerpo del dispositivo */
  --te-body: #c8c8c8; /* Gris metalico claro */
  --te-body-dark: #a0a0a0; /* Gris metalico oscuro */
  --te-body-highlight: #e0e0e0; /* Highlight metalico */

  /* Pantalla */
  --te-screen-bg: #1a1a1a; /* Negro profundo de pantalla */
  --te-screen-glow: #0d0d0d; /* Borde interno de pantalla */

  /* Colores de acento (del display) */
  --te-orange: #ff4500; /* Naranja principal */
  --te-red: #ce2021; /* Rojo indicador */
  --te-green: #1aa167; /* Verde */
  --te-blue: #1270b8; /* Azul */
  --te-yellow: #ffc003; /* Amarillo */
  --te-cyan: #00d4ff; /* Cyan para display */

  /* Botones */
  --te-button-black: #2a2a2a; /* Botones negros */
  --te-button-white: #f5f5f5; /* Botones blancos */
  --te-button-grey: #4a4a4a; /* Botones grises */

  /* Texto */
  --te-label: #ff4500; /* Labels naranjas */
  --te-text-dark: #1a1a1a; /* Texto oscuro */
  --te-text-light: #e5e5e5; /* Texto claro (en pantalla) */
}
```

---

## 2. ESTRUCTURA DEL DISPOSITIVO

### Layout Principal

El dashboard sera un "dispositivo virtual" completo:

```
+================================================================+
|                    BARRA SUPERIOR (puertos)                     |
+================================================================+
|                                                                |
|  HEADER SECTION                              SPEAKER GRILLE    |
|  - Logo/Titulo                               - Patron de       |
|  - Subtitulo                                   circulos        |
|                                                                |
+----------------------------------------------------------------+
|                                                                |
|                      PANTALLA LCD                              |
|  - Stats con display 7-segmentos                               |
|  - Iconos pixelados estilo 8-bit                               |
|  - Indicadores de estado                                       |
|                                                                |
+----------------------------------------------------------------+
|                                                                |
|  SECCION DE CONTROLES                                          |
|  - Knobs rotativos (volume, BPM)                               |
|  - Botones con grupos funcionales                              |
|  - Slider de volumen                                           |
|                                                                |
+----------------------------------------------------------------+
|                                                                |
|  GRID DE PEDIDOS (como pads del sampler)                       |
|  - Cards como botones fisicos 3D                               |
|  - Organizados en grid                                         |
|                                                                |
+================================================================+
```

---

## 3. COMPONENTES A IMPLEMENTAR

### 3.1 DeviceFrame (Contenedor Principal)

```
Caracteristicas:
- Bordes redondeados muy sutiles (2-4px)
- Textura metalica con gradiente
- Sombra exterior para "levantar" el dispositivo
- Bisel sutil en los bordes
```

### 3.2 TopBar (Barra de Puertos)

```
Elementos:
- Indicadores tipo LED (OUTPUT, INPUT, SYNC, MIDI)
- Estilo de labels industriales
- Mini orificios/ventilacion
```

### 3.3 SpeakerGrille (Rejilla de Altavoz)

```
Patron:
- Grid de circulos pequenos
- Espaciado uniforme
- Efecto de profundidad con sombra inset
- 15-20 columnas x 8-10 filas
```

### 3.4 ScreenDisplay (Pantalla Principal)

```
Elementos:
- Fondo negro con borde biselado
- Efecto de "brillo" sutil de LCD
- Font 7-segmentos (DSEG) para numeros
- Iconos pixelados/8-bit
- Scanlines sutiles opcionales
```

### 3.5 Knob3D (Perillas Rotativas)

```
Caracteristicas:
- Forma circular con gradiente radial
- Indicador de posicion (linea o punto)
- Sombra que sugiere volumen
- Hover effect sutil
- Labels debajo
```

### 3.6 Button3D (Botones Fisicos)

```
Tipos:
a) Boton Negro Grande (como numeros)
   - Superficie mate
   - Sombra inferior pronunciada
   - Click = translateY + sombra reducida

b) Boton Naranja (accent)
   - Color solido naranja
   - Mismo efecto 3D

c) Boton Blanco/Gris (secundario)
   - Para acciones secundarias

d) Boton pequeno cuadrado (como A,B,C,D)
   - Grid de acceso rapido
```

### 3.7 Slider3D (Fader de Volumen)

```
Caracteristicas:
- Track vertical con canal empotrado
- Knob deslizante con textura
- Sombra que indica profundidad del track
```

### 3.8 PedidoCard3D (Cards como Pads)

```
Estilo:
- Similar a los pads del sampler
- Efecto pressed al hacer click
- LED indicator en esquina (prioridad)
- Bordes sutiles redondeados
```

---

## 4. EFECTOS CSS CLAVE

### 4.1 Textura Metalica

```css
.metallic-surface {
  background: linear-gradient(
    135deg,
    #d8d8d8 0%,
    #c0c0c0 25%,
    #d0d0d0 50%,
    #b8b8b8 75%,
    #c8c8c8 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}
```

### 4.2 Boton 3D Fisico

```css
.button-3d {
  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
  box-shadow:
    0 4px 0 #1a1a1a,
    /* Sombra inferior (profundidad) */ 0 6px 8px rgba(0, 0, 0, 0.3),
    /* Sombra difusa */ inset 0 1px 0 rgba(255, 255, 255, 0.1); /* Highlight superior */
  transform: translateY(0);
  transition: all 0.05s ease;
}

.button-3d:active {
  box-shadow:
    0 1px 0 #1a1a1a,
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(3px);
}
```

### 4.3 Pantalla LCD

```css
.lcd-screen {
  background: #1a1a1a;
  border: 3px solid #0d0d0d;
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.5),
    inset 0 0 3px rgba(0, 212, 255, 0.1),
    /* Glow sutil */ 0 2px 4px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

/* Scanlines opcionales */
.lcd-screen::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
}
```

### 4.4 Speaker Grille

```css
.speaker-grille {
  background: radial-gradient(circle at center, #2a2a2a 35%, transparent 35%);
  background-size: 8px 8px;
  background-color: #1a1a1a;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
}
```

### 4.5 Knob Rotativo

```css
.knob {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #f0f0f0 0%, #d0d0d0 50%, #a0a0a0 100%);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.5),
    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
}

.knob::after {
  /* Indicador de posicion */
  content: '';
  position: absolute;
  width: 3px;
  height: 12px;
  background: #1a1a1a;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 2px;
}
```

---

## 5. TIPOGRAFIA

### Fuentes a Usar

```
1. DSEG7 Classic - Para displays numericos (stats, contadores)
   URL: https://www.keshikan.net/fonts-e.html

2. JetBrains Mono - Para texto general y labels
   Ya instalada

3. Opcional: Pixelated font para iconos de pantalla
   (Space Mono o similar)
```

### Jerarquia Tipografica

```
- Titulo dispositivo: 18px, bold, uppercase, tracking wide
- Stats display: 32-48px, DSEG7, peso normal
- Labels de botones: 10px, uppercase, tracking wider
- Texto de cards: 12px, normal
- Subtexto: 10px, secondary color
```

---

## 6. ICONOGRAFIA

### Reemplazar Lucide por Iconos Pixelados

Para mayor autenticidad, crear iconos estilo 8-bit/pixel art:

```
Opciones:
a) Usar CSS para dibujar iconos simples con box-shadow pixel art
b) Crear SVGs con estetica pixelada
c) Usar una fuente de iconos pixel (como "Press Start 2P" icons)
```

### Iconos Necesarios

```
- Circulo lleno (prioridad)
- Play/Pause
- Check/Complete
- Edit/Pencil
- Delete/Trash
- Plus/Add
- Calendar
- User
- Alert
- Settings
```

---

## 7. ESTRUCTURA DE ARCHIVOS

```
app/
  dashboard/
    components/
      device/
        DeviceFrame.tsx      # Contenedor principal
        TopBar.tsx           # Barra superior con LEDs
        SpeakerGrille.tsx    # Patron de altavoz
        ScreenDisplay.tsx    # Pantalla LCD principal
      controls/
        Knob3D.tsx          # Perilla rotativa
        Button3D.tsx        # Boton fisico 3D
        Slider3D.tsx        # Fader vertical
        ButtonGroup.tsx     # Grupo de botones
      cards/
        PedidoPad.tsx       # Card estilo pad
      icons/
        PixelIcons.tsx      # Iconos pixelados

    page.tsx               # Composicion final

  globals.css              # Variables y estilos base actualizados
```

---

## 8. PLAN DE IMPLEMENTACION

### Fase 1: Fundamentos (CSS Base)

1. Actualizar variables CSS con nueva paleta
2. Agregar fuente DSEG7 para displays
3. Crear clases base para texturas (metalica, LCD, etc)
4. Definir sombras y efectos 3D base

### Fase 2: Componentes Atomicos

1. Button3D con variantes (negro, naranja, blanco)
2. Knob3D con indicador
3. Indicadores LED
4. Labels industriales

### Fase 3: Estructura del Dispositivo

1. DeviceFrame con textura metalica
2. TopBar con puertos/LEDs
3. SpeakerGrille con patron de puntos
4. ScreenDisplay con efecto LCD

### Fase 4: Pantalla y Stats

1. Display de stats con font 7-segmentos
2. Iconos de estado pixelados
3. Indicadores de seccion
4. Animaciones de "parpadeo" LCD

### Fase 5: Cards de Pedidos

1. PedidoPad con efecto 3D
2. Estados (hover, active, completed)
3. Indicadores LED de prioridad
4. Integracion con grid

### Fase 6: Modal Actualizado

1. Modal como "overlay de pantalla"
2. Formulario con inputs estilo LCD
3. Botones consistentes con el tema

### Fase 7: Animaciones y Polish

1. Transiciones suaves
2. Feedback visual al interactuar
3. Estados de loading
4. Responsive ajustes

---

## 9. CONSIDERACIONES TECNICAS

### Performance

- Usar CSS transforms en lugar de cambios de layout
- Limitar uso de box-shadow complejos en elementos repetidos
- Considerar will-change para animaciones frecuentes

### Accesibilidad

- Mantener contraste suficiente en textos
- Focus states visibles
- Keyboard navigation funcional

### Responsive

- En mobile: simplificar a vista mas plana
- Mantener funcionalidad core
- Adaptar grid de cards

---

## 10. MOCKUP VISUAL FINAL

```
+==============================================================+
|  [LED] OUTPUT  [LED] INPUT  [LED] SYNC  [LED] MIDI     POWER |
+==============================================================+
|                                                              |
|   RESET R&A                              .:.:.:.:.:.:.:.:.: |
|   PEDIDOS v1.0                           .:.:.:.:.:.:.:.:.: |
|   GESTION DE PEDIDOS                     .:.:.:.:.:.:.:.:.: |
|                                          .:.:.:.:.:.:.:.:.: |
|                                                              |
+--------------------------------------------------------------+
|  +--------------------------------------------------------+  |
|  |  [A]  [SYNC]    TOTAL    ACTIVOS   COMPLETOS          |  |
|  |  [B]  [REC]      12        08         04      [>>>]   |  |
|  |  [C]  [D]       ----      ----       ----             |  |
|  |  [SOUND]  [MAIN]    URGENTES: 03   [PLAY] [FX]       |  |
|  +--------------------------------------------------------+  |
|                                                              |
|   (VOLUME)   [NUEVO]  [FILTRAR]  [REFRESH]      (BPM)       |
|      ||      [PEDIDO] [ESTADO]   [DATOS]         ||         |
|      ||                                          ||         |
|                                                              |
+--------------------------------------------------------------+
|                                                              |
|   URGENTES                                                   |
|   +------------+  +------------+  +------------+             |
|   | [LED] BCP  |  | [LED] MOV  |  | [LED] CLA  |             |
|   | Analisis.. |  | Reporte..  |  | Dashboard..|             |
|   | Vence HOY  |  | Atrasado   |  | Vence HOY  |             |
|   | [V] [E][X] |  | [V] [E][X] |  | [V] [E][X] |             |
|   +------------+  +------------+  +------------+             |
|                                                              |
|   ESTA SEMANA                                                |
|   +------------+  +------------+                             |
|   | [LED] AFP  |  | [LED] RIM  |                             |
|   | Estudio..  |  | Informe..  |                             |
|   | 3 dias     |  | 5 dias     |                             |
|   | [V] [E][X] |  | [V] [E][X] |                             |
|   +------------+  +------------+                             |
|                                                              |
+==============================================================+
|   [TIP] Usa /nuevopedido en Telegram        Reset R&A 2024  |
+==============================================================+
```

---

## APROBACION

Este plan cubre todos los aspectos para transformar el dashboard en una experiencia visual autentica inspirada en el Teenage Engineering K.O. II / EP-133.

Elementos diferenciadores:

- Textura metalica realista
- Botones con volumen fisico 3D
- Pantalla LCD con font de segmentos
- Speaker grille decorativo
- Knobs rotativos
- Labels industriales
- Paleta de colores autentica

Cuando apruebes, procedo con la implementacion fase por fase.
