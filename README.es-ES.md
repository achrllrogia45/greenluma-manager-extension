

# (GUMA) GreenLuma Manager — Extensión para Navegador

<p align="center">
  <img width="35%" height="auto" src="https://github.com/achrllrogia45/greenluma-manager-extension/blob/main/icon.png">
</p>
<p align="center">
	<em> ¡Sé uno de estos! </em>
</p>
<p align="center">
  <a href="https://github.com/achrllrogia45/greenluma-manager-extension/"><img src="https://img.shields.io/github/stars/achrllrogia45/greenluma-manager-extension?style=social"></a>
  <a href="https://github.com/achrllrogia45/"><img src="https://img.shields.io/github/followers/achrllrogia45?style=social"></a>
</p>

<p align="center">
  <a href="https://github.com/achrllrogia45/greenluma-manager-extension/releases/"><strong>Descarga (Lanzamientos)</strong></a>
  ·
  <a href="https://github.com/achrllrogia45/greenluma-manager-extension/">Repositorio</a>
</p>

<p align="center">
  <em>
    Construye, organiza y exporta listas de AppID de Steam (Juegos y DLC) a archivos compatibles con GreenLuma; ahora con modo Panel Lateral, Entrada Manual, arrastrar y soltar URLs, edición masiva y filtros rápidos.
  </em>
</p>

---

<p align="center">
	<img width="580" alt="image" src="https://github.com/user-attachments/assets/d1384651-727b-44a5-96c1-def28db16fff" />
</p>


---

## ¿Por qué GUMA?
GUMA es una herramienta ligera para listas de aplicaciones de Steam que se enfoca en **velocidad**, **flujos de trabajo masivos** y **exportaciones limpias**:
- Obtener metadatos de Steam
- Mantener las listas organizadas (juegos y DLC)
- Editar/reordenar en lotes
- Exportar en formatos listos para usar de inmediato

---

## Características Principales

### 🧩 Espacio de trabajo con Panel Lateral fijado
**Menú de Acción Flotante**
**_(proporcionado por el navegador compatible)_**
- Abrir en Nueva Ventana
- Abrir en Nueva Pestaña
- Abrir en Panel Lateral (fijar)
<p align="center">
	<img width="1119" height="975" alt="image" src="https://github.com/user-attachments/assets/629c1ea2-41e2-4b28-95c6-79a0abc30ff7" />

</p>


### ✍️ Entrada Manual (pegar → obtener → guardar)
- Pegar **AppID únicos o en lotes**
- Obtener **nombres + tipos** desde Steam
- Se almacena localmente para que tu lista manual persista
<p align="center">
  <img width="551" alt="image" src="https://github.com/user-attachments/assets/f556f89e-681e-41a7-ad08-1caec00447db" />
</p>


### 🔗 Arrastrar y soltar URLs de Steam
- Soltar enlaces desde:
  - Steam Store `https://store.steampowered.com/`
  - SteamDB `https://steamdb.info/`
  - GUMA extrae el **AppID**, lo agrega a la lista e intenta la **detección de DLC**.
<p align="center">
 <img width="1119" alt="image" src="https://github.com/user-attachments/assets/d342d84d-2de4-4971-8f09-79b8cbb02dbf" />
</p>


### 🔎 Búsqueda y filtrado rápidos
- Filtrado en tiempo real para:
  - Resultados de **Get App List** desde `https://store.steampowered.com/api`
  - Resultados de **Búsqueda en Steam Store** desde `https://store.steampowered.com/search?term=`
  - Lista de **Juegos Guardados**
- Entrada con retardo (debounce) + soporte para **Enter**
- Limpiar **estado vacío** cuando no hay coincidencias

### 🧰 Herramientas masivas
- Reordenamiento por **arrastrar y soltar con selección múltiple** (comportamiento de pila)
- Cambios masivos de **tipo** (menú desplegable)

### 📦 Importar / Exportar
- Importar/exportar listas para respaldos
- Exportación masiva de AppLists (copiar al portapapeles, `.zip`, `.txt`, `.bat`, etc.)


---

## Instalación (Chrome / Edge)
1. Descargar:
   - **ZIP desde el repositorio**: haz clic en **Código → Descargar ZIP**
   - o descarga la última versión desde **Lanzamientos**
2. Abre la página de Extensiones:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Habilita el **Modo de desarrollador**
4. Haz clic en **Cargar desempaquetado** → selecciona la carpeta extraída de la extensión

---

## Inicio Rápido
1. Abre GUMA desde la barra de herramientas (o fíjalo al Panel Lateral)
2. Agrega elementos usando cualquier flujo de trabajo:
   - Buscar y obtener desde **SteamAPI / Steam Store** de Steam
   - Entrada Manual (pegar AppIDs)
   - Arrastrar y soltar enlaces de Steam/SteamDB
3. Filtra, selecciona múltiples, reordena y establece tipos
4. Exporta tu lista para GreenLuma

---

## Permisos y Red
GUMA puede solicitar o usar:
- **Almacenamiento local** — guardar tus listas + preferencias de la interfaz (p. ej., tamaño de la ventana de Entrada Manual)
- **Puntos finales de Steam** — obtener metadatos (nombres/tipos)
- **Permiso de Panel Lateral (`sidePanel`)** — requerido para el modo Panel Lateral

> La disponibilidad del Panel Lateral depende de tu versión de Chromium y del entorno de la extensión.

---

## Contribuciones
Las contribuciones son bienvenidas:
- **Errores:** por favor, incluye los pasos para reproducirlos + capturas de pantalla/registros si es posible  
  (y agrupa los problemas menores si puedes)
- **Funcionalidades:** abre un issue con tu idea y el comportamiento esperado
- **PRs:** los cambios limpios y enfocados son los más fáciles de revisar

---

## Licencia
Código abierto, siéntete libre de usarlo. 
Pero, sí mencióname por favor..

---

## Descargo de responsabilidad
No afiliado con, respaldado por ni patrocinado por Steam o Valve Corporation.
