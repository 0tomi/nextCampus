---
name: nextCampus
version: "alpha"
description: Un campus estudiantil hecho por estudiantes, para estudiantes.
colors:
  primary: "#cc0000"
  accent: "#003366"
  surface-0: "#0f0f0f"
  surface-1: "#1a1a1a"
  surface-2: "#141414"
  surface-3: "#0a0a0a"
  uader-red: "#cc0000"
  uader-red-light: "#e80000"
  uader-red-dark: "#990000"
  uader-blue: "#003366"
  uader-blue-light: "#1e5a8f"
typography:
  sans:
    fontFamily: "var(--font-jakarta), system-ui, sans-serif"
  display:
    fontFamily: "var(--font-sora), system-ui, sans-serif"
rounded:
  sm: 6px
  DEFAULT: 8px
  lg: 12px
  xl: 16px
---

## Overview

nextCampus es un campus alternativo construido desde cero por estudiantes, pensado para estudiantes. Su identidad visual busca reflejar seriedad académica (heredando la paleta institucional) pero con un giro moderno, digital y enfocado en la usabilidad. Destaca por un modo oscuro (dark mode) predominante con acentos vibrantes que diferencian cada año o asignatura.

## Colors

La paleta se fundamenta en un modo oscuro profundo, utilizando tonos institucionales y semánticos:

- **Primary / UADER Red (#cc0000):** El color principal de acción y estados activos. Derivado de la identidad institucional.
- **Accent / UADER Blue (#003366):** Utilizado para contrastes secundarios.
- **Surfaces:** Una escala de grises muy oscuros (`#0f0f0f` para el fondo principal, hasta `#1a1a1a` para tarjetas y contenedores) diseñada para reducir la fatiga visual.
- **Academic Gradients:** Se utilizan gradientes vibrantes basados en la paleta extendida (Amber, Emerald, Violet, Rose, Cyan) para clasificar y distinguir visualmente cada año académico o materia.

## Typography

Las tipografías apuntan a una legibilidad extrema y una estética contemporánea:

- **Sans (Jakarta):** Tipografía principal para todo el cuerpo de texto, botones y metadata. Limpia y geométrica.
- **Display (Sora):** Reservada para titulares, encabezados de página y elementos de gran jerarquía.

## Layout & Spacing

El diseño prioriza la amplitud y el enfoque en el contenido de estudio (como apuntes y calendarios). Se aprovechan los espacios negativos para crear una interfaz limpia y libre de distracciones.

## Elevation

La elevación se maneja de forma sutil y moderna para mantener la interfaz limpia en modo oscuro:

- **Sombras suaves/lift:** Se utilizan sombras tenues o bordes semitransparentes (`border-white/5` a `border-white/10`) para delimitar las tarjetas regulares y contenedores de contenido frente a los fondos oscuros.

## Shapes

Los bordes redondeados (radii) son consistentes en toda la aplicación:

- **0px (none) / 6px (`sm`) / 8px (`DEFAULT`):** Utilizados para botones, inputs y tarjetas interactivas como la `DarkCard`.
- **12px (`lg`) / 16px (`xl`):** Aplicados a contenedores mayores y modales.

## Components

*(Nota: La documentación de los componentes y la arquitectura de UI se expandirá aquí a medida que se estandaricen el resto de módulos).*

## Do's and Don'ts

- **Do:** Mantener una comunicación directa y amigable. El lenguaje debe ser "de estudiante a estudiante", sin sobrecargar con formalidades innecesarias.
- **Do:** Usar correctamente los distintos niveles de superficie (`surface-0` a `surface-3`) combinados con bordes sutiles (`border-white/5`) para diferenciar las capas de la interfaz en modo oscuro.
- **Don't:** Anotar ni exponer cuestiones técnicas o de infraestructura en el frontend. Frases como "renderiza en el servidor" o alusiones al framework técnico son inaceptables para el usuario final.
