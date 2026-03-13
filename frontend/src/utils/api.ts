import axios from "axios"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  timeout: 10000,
})

export const getNews      = (source?: string) => api.get("/api/news/",     { params: { source, limit: 30 } }).then(r => r.data)
export const getInjuries  = ()                => api.get("/api/injuries/").then(r => r.data)
export const getBetting   = ()                => api.get("/api/betting/").then(r => r.data)
export const getSchedule  = ()                => api.get("/api/schedule/games").then(r => r.data)
export const getStandings = ()                => api.get("/api/schedule/standings").then(r => r.data)
export const getStats     = ()                => api.get("/api/stats/").then(r => r.data)
export const getTweets    = ()                => api.get("/api/tweets/").then(r => r.data)
export const getBirthdays = ()                => api.get("/api/birthdays/upcoming").then(r => r.data)
export const getArticles = (limit = 20) => api.get("/api/articles/", { params: { limit } }).then(r => r.data)
export const getArticle = (slug: string) => api.get(`/api/articles/${slug}`).then(r => r.data)
export const generateNextGameArticle = () => api.post("/api/articles/generate/next-game").then(r => r.data)
