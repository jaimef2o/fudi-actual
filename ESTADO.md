# ESTADO.md — fudi App — Estado actual de implementación
### Generado: Marzo 2026 · Referencia rápida para onboarding de contexto

> Este documento complementa a `CLAUDE.md`. Lee CLAUDE.md primero (diseño, spec, DB schema).
> Aquí encontrarás qué está ya construido, cómo está estructurado el código y qué falta.

---

## STACK INSTALADO

```
Expo SDK 54 · Expo Router 6
Supabase JS 2.99 (auth, DB, storage, realtime)
Zustand 5 · TanStack Query 5.91
NativeWind 4.2 + Tailwind 3.4
React Hook Form · Expo Image Picker/Manipulator
Expo Notifications · Expo Apple Auth · Google Sign-In
Sentry 7.2 · Manrope + Noto Serif (Google Fonts)
```

---

## ESTRUCTURA DE CARPETAS

```
app/
  _layout.tsx               ← Root layout, AuthProvider, Stack screens registradas
  index.tsx                 ← Redirect a auth o (tabs) según sesión
  (tabs)/
    _layout.tsx             ← Nav bar inferior (5 tabs, glassmorfismo)
    feed.tsx                ← Feed principal
    listas.tsx              ← Mis Listas (Histórico + Guardados)
    nuevo.tsx               ← Modal FAB con dos opciones
    descubrir.tsx           ← Pantalla Descubrir
    amigos.tsx              ← Pantalla Amigos
  auth/
    index.tsx               ← Teléfono + OTP + Apple/Google
    verify.tsx              ← Verificación OTP
    name.tsx                ← Nombre + handle
    preferences.tsx         ← Preferencias de cocina (saltable)
  restaurant/[id].tsx       ← Detalle de restaurante
  journey-b/[restaurantId]  ← "¿Qué pedimos?" (pantalla oscura)
  registrar-visita.tsx      ← Journey C — registro de visita completo
  visit/[id].tsx            ← Publicación / detalle de visita
  ranking.tsx               ← Ranking personal completo
  refine-ranking.tsx        ← Refinado por pares (OR circle)
  comparison/[restaurantId] ← Comparación binaria al registrar
  select-restaurant.tsx     ← Autocomplete Google Places
  profile/[userId].tsx      ← Perfil propio y ajeno
  profile/edit.tsx          ← Editar perfil
  saved-posts.tsx           ← Posts guardados
  invite/[token].tsx        ← Reclamar invitación

lib/
  supabase.ts               ← Client Supabase (AsyncStorage persist)
  database.types.ts         ← Tipos TS generados del schema Supabase
  storage.ts                ← Upload/download imágenes a Supabase Storage
  sentimentColors.ts        ← Paleta de colores loved/fine/disliked + scorePalette()
  notifications.ts          ← Push notifications (Expo + FCM/APNs)
  monitoring.ts             ← Sentry init
  chains.ts                 ← Resolución de franquicias (resolveChainId)
  api/
    visits.ts               ← CRUD visitas, ranking, recomputeRankPositions, deleteVisit
    users.ts                ← Perfiles, relaciones, invitaciones, búsqueda
    restaurants.ts          ← Restaurantes, stats, platos de amigos (chain-aware)
    feed.ts                 ← Feed de amigos mutuos, feed propio
    auth.ts                 ← Auth phone/OTP/Apple/Google
    dishes.ts               ← Catálogo de platos, búsqueda
    places.ts               ← Google Places API (autocomplete, detalles, fotos)
    savedPosts.ts           ← Restaurantes guardados del usuario
  hooks/
    useFeed.ts              ← Feed infinito con suscripción realtime
    useRestaurant.ts        ← Detalles restaurante, stats, platos amigos
    useVisit.ts             ← Visita individual + mutations (delete, update, bookmark)
    useProfile.ts           ← Perfil, amigos, relaciones
    useDish.ts              ← Plato individual
    useDishSearch.ts        ← Búsqueda de platos con debounce

store/index.ts              ← Zustand: currentUser, toast, pendingInviteToken
context/AuthContext.tsx     ← Sesión Supabase + perfil del usuario actual
components/
  CityPicker.tsx
  LocationFilterBar.tsx
  NeighborhoodChips.tsx
  Toast.tsx
```

---

## BLOQUES IMPLEMENTADOS (estado por pantalla)

### ✅ Bloque 0 — Scaffold
- Expo Router configurado con 5 tabs
- NativeWind + Tailwind con todos los tokens de color de CLAUDE.md
- Fuentes Noto Serif + Manrope cargadas con expo-font
- Supabase client inicializado con persistencia AsyncStorage
- Variables de entorno: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

### ✅ Bloque 1 — Auth + Onboarding
- Auth por teléfono + OTP vía Supabase Phone Auth
- Apple Sign-In + Google Sign-In (Expo AuthSession)
- Pantalla de nombre + validación de handle único
- Pantalla de preferencias (cocinas + restricciones) — saltable
- Guard de sesión en `_layout.tsx` y `index.tsx`

### ✅ Bloque 2 — DB + API layer
- Todas las tablas del schema de CLAUDE.md
- Tipos TypeScript completos en `lib/database.types.ts`
- Queries principales implementadas (ver sección API más abajo)
- RLS policies: pendientes de configuración completa en Supabase dashboard

### ✅ Bloque 3 — Feed
- Query de visitas de amigos mutuos (cronológico inverso)
- Tarjeta de feed: carrusel cuadrado + score badge (coloreado por sentimiento) + quote + chips comanda + acompañantes
- Reacciones (😋 🔥) con optimistic update
- Guardar restaurante (bookmark)
- Suscripción realtime a nuevas visitas

### ✅ Bloque 4 — Restaurante + Journey B
- Página de restaurante: hero full-bleed, toggle Amigos/Global, bento stats, platos de amigos, visitas recientes, CTA sticky
- Journey B (pantalla oscura `#1a3a2b`): lista de platos rankeados por amigos
- Ambas screens son chain-aware (ver sección Franquicias)

### ✅ Bloque 5 — Journey C — Registrar Visita
- Google Places autocomplete para seleccionar restaurante
- Paso A: selección de sentimiento (3 círculos — loved/fine/disliked)
- Paso B: comparaciones binarias reales (binary search con lo/hi/history para undo)
- Sección platos: add inline, drag para ordenar, foto por plato
- Nota + fotos del restaurante
- Etiquetado de amigos (visit_tags)
- Al terminar: redirige a comparison/[restaurantId]

### ✅ Bloque 6 — Listas, Ranking, Amigos, Perfil
- Mis Listas: tabs Histórico/Guardados, lista rankeada, filtros cuisine/precio/ciudad, chips info sin ubicación
- Ranking personal completo: filtros, sentimiento coloreado, SVG circular, "Rank" button → refine-ranking
- Refine-ranking: pares inciertos (diff ≤ un step del bracket), mismo formato que comparison (OR circle)
- Pantalla Amigos: cards con afinidad, banner invitación, filter chips
- Perfil: hero, stats, tabs Favoritos/Visitas/Listas, "Ver mi ranking completo" → ranking.tsx

### ✅ Bloque 7 — Detalle de Visita (Publicación)
- Carrusel full-screen (60vh) con overlay gradient
- Metadata + quote + score badge coloreado por sentimiento
- Comanda numerada con fotos
- Botones: Guardar post / Guardar restaurante / **Eliminar** (solo posts propios, con confirmación)

---

## SISTEMA DE SCORES — LÓGICA IMPLEMENTADA

```
Brackets canónicos (SCORE_BRACKETS en lib/api/visits.ts):
  loved:    7.5 – 10.0
  fine:     5.0 – 7.4
  disliked: 1.0 – 4.9

Fórmula de score (1 decimal):
  score = max - (max - min) * idx / (total - 1)
  Math.round(score * 10) / 10

Flujo de ranking:
  1. Usuario elige sentimiento (loved/fine/disliked)
  2. Binary search (lo/hi) contra restaurantes del MISMO bracket
  3. Al insertar: finishComparison(insertIdx) → calcBracketScore
  4. recomputeRankPositions(userId) recalcula TODOS los scores y posiciones globales

Refine-ranking:
  - buildUncertainPairs: pares adyacentes dentro del mismo bracket
    donde |score_diff| ≤ span/(n-1) + 0.05
  - swapVisitRanks() intercambia posición+score entre dos visitas
  - Al terminar: recomputeRankPositions()
```

---

## SISTEMA DE COLORES (lib/sentimentColors.ts)

```ts
loved:    { badgeBg: '#c7ef48', badgeText: '#546b00', ring: '#aed52e' }   // lima
fine:     { badgeBg: '#fde68a', badgeText: '#92400e', ring: '#d97706' }   // ámbar
disliked: { badgeBg: '#fecaca', badgeText: '#ba1a1a', ring: '#ef4444' }   // rojo
unknown:  { badgeBg: '#f1ede6', badgeText: '#727973', ring: '#c1c8c2' }   // gris

sentimentPalette(sentiment)  → para visitas con sentimiento conocido
scorePalette(score)          → para scores agregados (Descubrir, restaurante)
```

Aplicado en: feed, visit/[id], ranking, refine-ranking, descubrir.

---

## FRANQUICIAS / CHAINS (lib/chains.ts)

```
resolveChainId(restaurantName) → string | null
  Normaliza el nombre (lowercase, sin acentos) y busca en catálogo de cadenas.

getRelevantRestaurantIds(restaurantId) → string[]
  - Restaurante independiente → [restaurantId]
  - Franquicia → [id1, id2, ...] (todos los locales de la cadena)

Impacto:
  - upsertRestaurant() asigna chain_id automáticamente
  - getFriendDishes() usa .in('restaurant_id', restaurantIds)
  - getRecentVisits() usa .in('restaurant_id', restaurantIds)
  - UI restaurant/[id].tsx y journey-b/[restaurantId].tsx: PENDIENTE de usar useRelevantRestaurantIds
```

---

## API — FUNCIONES CLAVE

### lib/api/visits.ts
| Función | Descripción |
|---------|-------------|
| `getVisit(id)` | Visita completa con usuario, restaurante, platos, fotos |
| `getUserRanking(userId)` | Lista de visitas rankeadas del usuario |
| `createVisit(input)` | Crea visita con platos, fotos, etiquetas |
| `deleteVisit(visitId, userId)` | Elimina visita propia + recomputa ranking |
| `recomputeRankPositions(userId)` | Recalcula scores y posiciones de todo el ranking |
| `swapVisitRanks(a, b)` | Intercambia posición+score entre dos visitas |
| `toggleReaction(visitId, userId, emoji)` | Añade/quita reacción |
| `bookmarkRestaurant(userId, restaurantId, save)` | Guarda/quita restaurante |
| `getRestaurantExistingScore(userId, restaurantId)` | Score previo si ya fue rankeado |
| `SCORE_BRACKETS` | Constante con rangos loved/fine/disliked |

### lib/api/restaurants.ts
| Función | Descripción |
|---------|-------------|
| `getRestaurant(id)` | Detalle de restaurante |
| `upsertRestaurant(data)` | Crea o actualiza restaurante (asigna chain_id) |
| `getRestaurantStats(id, userId)` | Visitas, guardados, puntuación media |
| `getFriendDishes(restaurantIds[], userId)` | Platos más pedidos por amigos (chain-aware) |
| `getRecentVisits(restaurantIds[], userId)` | Visitas recientes de amigos (chain-aware) |
| `getDiscoverRestaurants(userId, filter)` | Restaurantes para Descubrir |

### lib/api/users.ts
| Función | Descripción |
|---------|-------------|
| `getProfile(userId)` | Perfil completo con stats |
| `updateProfile(userId, data)` | Actualiza nombre, ciudad, bio, avatar |
| `getFriends(userId)` | Lista de amigos mutuos con afinidad |
| `followUser / unfollowUser` | Gestionar relaciones |
| `createInvitation(userId)` | Genera token de invitación |
| `claimInvitation(token, userId)` | Reclama invitación |
| `searchUsers(query)` | Búsqueda de usuarios por nombre/handle |

---

## HOOKS — REFERENCIA RÁPIDA

```ts
// Feed
useFeed(userId)           → { data: FeedPost[], fetchNextPage, hasNextPage }
useUserFeed(userId)       → posts propios del usuario

// Restaurante
useRestaurant(id)         → datos + stats + platos amigos + visitas recientes
useFriendDishes(ids[])    → platos de amigos (chain-aware, pasa restaurantIds)
useRecentVisits(ids[])    → visitas recientes (chain-aware)

// Visita
useVisit(id)              → visita completa
useDeleteVisit()          → mutación: { mutateAsync({visitId, userId}) }
useBookmark(userId)       → mutación: guardar/quitar restaurante
useSavePost(userId)       → mutación: guardar/quitar post
useUpdateVisitRank()      → mutación: actualizar rank_position/score

// Ranking
useUserRanking(userId)    → lista rankeada del usuario

// Perfil
useProfile(userId)        → perfil + stats
useFriends(userId)        → amigos con afinidad
useRelationship(myId, targetId) → estado relación (mutual/following/none)

// Dishes
useDishSearch(query)      → búsqueda con debounce
```

---

## PENDIENTES CONOCIDOS

### Alta prioridad
- **Chains UI**: `app/restaurant/[id].tsx` y `app/journey-b/[restaurantId].tsx` deben usar `useRelevantRestaurantIds(id)` y pasar el array a `useFriendDishes` / `useRecentVisits`. Actualmente pasan solo el ID individual.
- **Ranking deduplicado por restaurante**: `getUserRanking()` debería agrupar por `restaurant_id` y mostrar un único entry por restaurante (con score = media de todas las visitas). Actualmente muestra una fila por visita. El `recomputeRankPositions` necesita adaptarse a esta lógica.
- **Re-ranking de restaurante ya visitado**: Cuando el usuario registra una visita a un restaurante ya en su ranking, falta la lógica de promediar el nuevo score con el existente.
- **RLS policies en Supabase**: Configurar en dashboard que cada usuario solo vea visitas de sus amigos mutuos.

### Media prioridad
- `lib/api/dishes.ts` → `getRestaurantDishStats(restaurantId)` debe aceptar `restaurantIds: string[]` para ser chain-aware
- `lib/hooks/useRestaurant.ts` → Añadir `useRelevantRestaurantIds(restaurantId)` hook
- Creator Mode: campo `is_creator` existe en DB pero sin lógica de UI (MVP: ignorar)
- Contactos sync: pantalla soft-gate de amigos no implementada
- Push notifications: registro solo después del primer feed (actualmente se puede pedir antes)

### Baja prioridad
- Mapa en Descubrir (FAB de mapa visible pero sin funcionalidad)
- Compartir visita (botón "Compartir" en visit/[id].tsx llama a Share.share nativo — funciona, pero no hay deep link configurado)
- Perfil → edición de avatar (pantalla existe, upload a Storage implementado)

---

## VARIABLES DE ENTORNO NECESARIAS

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSy...
```

---

## CONVENCIONES DE CÓDIGO

- **Sin negro puro**: texto siempre `#1c1c18` (on-surface), nunca `#000000`
- **Sin borde 1px**: separar secciones por cambio de color de fondo
- **Score siempre 1 decimal**: `score.toFixed(1)` en toda la UI
- **Noto Serif**: nombres restaurantes, platos, quotes, títulos editoriales → `fontFamily: 'NotoSerif-Bold'`
- **Manrope**: todo lo demás → `fontFamily: 'Manrope-Regular'` / `'Manrope-Bold'`
- **StyleSheet.create** en vez de estilos inline (salvo overrides menores de color)
- **Colores de sentimiento**: siempre via `sentimentPalette(sentiment)` o `scorePalette(score)`, nunca hardcoded `#c7ef48`

---

*ESTADO.md v1.0 — Marzo 2026 — Complemento operativo de CLAUDE.md*
