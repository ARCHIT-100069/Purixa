import axios from 'axios'

// In production (Vercel), VITE_API_URL points to Railway backend.
// In local dev, Vite proxies /api → localhost:8000.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5 minutes for large files
})


export const uploadFile = async (file, onUploadProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
  return res.data
}

export const startCleaning = async (fileId, config) => {
  const res = await api.post(`/clean/${fileId}`, { file_id: fileId, ...config })
  return res.data
}

export const getStatus = async (jobId) => {
  const res = await api.get(`/status/${jobId}`)
  return res.data
}

export const getPreview = async (jobId) => {
  const res = await api.get(`/preview/${jobId}`)
  return res.data
}

export const downloadFile = (jobId, format = 'csv') => {
  window.open(`/api/download/${jobId}?format=${format}`, '_blank')
}

export const cleanupFile = async (fileId) => {
  await api.delete(`/cleanup/${fileId}`)
}
