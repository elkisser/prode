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
