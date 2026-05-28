import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const login = (username, password) => {
  const form = new FormData()
  form.append('username', username)
  form.append('password', password)
  return api.post('/auth/token', form)
}

export const register = (username, password, fifaUsername) =>
  api.post('/auth/register', { username, password, fifa_username: fifaUsername })

export const getMe = () => api.get('/auth/me')
export const getStandings = () => api.get('/league/standings')
export const getHistory = () => api.get('/league/history')
export const getStats = () => api.get('/league/stats')
export const getSimulation = () => api.get('/league/simulation')
export const triggerSync = () => api.post('/admin/sync')
export const getProbabilityHistory = () => api.get('/league/probability-history')
export const getLeagueStatus = () => api.get('/league/status')
export const getFixtures = () => api.get('/league/fixtures')
export const getRoundsDebug = () => api.get('/league/rounds-debug')

export default api
