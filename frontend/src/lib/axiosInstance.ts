// lib/axios.ts
import axios from "axios"

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Gắn token tự động 
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default axiosInstance
