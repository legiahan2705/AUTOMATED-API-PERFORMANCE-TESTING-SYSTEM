import axios from "axios"

 const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api

export const fetchProjectById = async (id: number) => {
  const res = await api.get(`/project/${id}`);
  return res.data;
};


