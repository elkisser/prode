# PRODE

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=06121a)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=0b1b13)

PRODE de fútbol fullstack para jugar con amigos: creás una liga, elegís una competencia real, sincronizás fixtures, hacés predicciones y ves posiciones.

> [!IMPORTANT]
> El frontend nunca consume APIs externas de fútbol directamente. Toda sincronización se hace en backend (Supabase Edge Function) y se persiste en Supabase.

## 🧭 Contenido

- [✨ Features](#-features)
- [🏗️ Arquitectura](#️-arquitectura)
- [🧠 Modos de predicción](#-modos-de-predicción)
- [⚽ Proveedores de datos](#-proveedores-de-datos)
- [🚀 Setup local](#-setup-local)
- [🔐 Seguridad](#-seguridad)
- [📦 Deploy](#-deploy)

## ✨ Features

- Crear liga / unirse por código
- Una competencia por liga (sin mezclar partidos de otras competencias)
- Sincronización de fixtures y resultados reales
- Predicción:
  - Modo Simple (1X2)
  - Modo Experto (resultado exacto)
- Tabla de posiciones por liga (puntos por predicción)
- UI responsive (mobile + desktop), modo oscuro

## 🏗️ Arquitectura

- Frontend: React + TypeScript + Tailwind + React Query + Zustand
- Backend: Supabase (Postgres + Auth + RLS + Realtime + Edge Functions)

Flujo principal:

1. Usuario crea liga y elige competencia
2. Frontend invoca `sync-fixtures` (Edge Function)
3. La función llama al proveedor de datos según competencia
4. Se hace upsert de partidos en `matches`
5. Frontend lee `matches` filtrando por `competition_id`

## 🧠 Modos de predicción

- **Simple**: se elige ganador (Local / Empate / Visitante)
- **Experto**: se ingresa marcador (goles)

Puntaje:

- Exacto: +5
- Ganador/empate: +3

## ⚽ Proveedores de datos

La Edge Function elige proveedor sin exponerlo al frontend:

- **UEFA Champions / Europa / Mundial**
  - Primario: API-Football
  - Fallback: football-data.org si el plan de API-Football no permite la temporada actual
- **Ligas nacionales**
  - TheSportsDB

> [!NOTE]
> Los tiers gratuitos pueden tener limitaciones (temporadas, delay, etc.). La app intenta dar datos reales y evitar “inventar” fixtures.

## 🚀 Setup local

### 1) Requisitos

- Node.js 18+
- Un proyecto Supabase (URL + anon key)

### 2) Variables de entorno (frontend)

Copiá el ejemplo:

```bash
cp .env.example .env
```

Completá:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3) Secrets en Supabase (Edge Function)

Configurar en Supabase (Edge Function Secrets):

- `SERVICE_ROLE_KEY` (obligatorio para upsert server-side)
- `API_FOOTBALL_KEY` (opcional, para UEFA/Mundial si tu plan lo permite)
- `FOOTBALL_DATA_TOKEN` (recomendado, fallback para UEFA/Mundial)

### 4) Deploy de la Edge Function

La función vive en:

- `supabase/functions/sync-fixtures/index.ts`

Deploy según tu flujo (Supabase CLI o Dashboard).

### 5) Ejecutar

```bash
npm install
npm run dev
```

## 🔐 Seguridad

> [!WARNING]
> Nunca subas `.env` al repositorio. Si alguna vez se subió, asumí que los secretos fueron comprometidos y rotalos.

Recomendado:

- Mantener `.env` ignorado por git
- Usar `.env.example` con placeholders (sin secretos reales)
- Rotar/revocar:
  - `SERVICE_ROLE_KEY`
  - tokens de proveedores (API-Football / football-data)

## 📦 Deploy

- `npm run build` genera `/dist`
- Hostear `/dist` en el proveedor que uses (Netlify/Vercel/Cloudflare/etc.)
- Mantener los secrets del lado de Supabase (Edge Functions), no en el frontend

