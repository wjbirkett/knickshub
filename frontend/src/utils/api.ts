// frontend/src/utils/api.ts
import axios from "axios"

// Ensure Vite env variables are typed
const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

// ===== Types =====
export interface Article {
  slug: string
  title: string
  content: string
  article_type: string
  game_date: string
  home_team: string
  away_team: string
  key_picks?: any
}

// ===== API functions =====
export const getNews = (source?: string) =>
  api.get("/api/news/", { params: { source, limit: 30 } }).then(r => r.data)

export const getInjuries = () =>
  api.get("/api/injuries/").then(r => r.data)

export const getBetting = () =>
  api.get("/api/betting/").then(r => r.data)

export const getSchedule = () =>
  api.get("/api/schedule/games").then(r => r.data)

export const getStandings = () =>
  api.get("/api/schedule/standings").then(r => r.data)

export const getStats = () =>
  api.get("/api/stats/").then(r => r.data)

export const getTweets = () =>
  api.get("/api/tweets/").then(r => r.data)

export const getBirthdays = () =>
  api.get("/api/birthdays/upcoming").then(r => r.data)

export const getArticles = (limit = 20) =>
  api.get<Article[]>("/api/articles/", { params: { limit } }).then(r => r.data)

export const getResults = () => fetch(`${BASE_URL}/api/articles/results`).then(r => r.json())
export const getArticle = (slug: string) =>
  api.get<Article>(`/api/articles/${slug}`).then(r => r.data)

export const generateNextGameArticle = () =>
  api.post("/api/articles/generate/next-game").then(r => r.data)
