// src/hooks/useUser.ts
"use client"

import { useEffect, useState } from "react"

interface UserData {
  name: string
  email: string
  token: string
}

/**
 * Hook useUser
 * Lấy thông tin người dùng và token từ localStorage
 */
export function useUser() {
  const [user, setUser] = useState<null | UserData>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const storedToken = localStorage.getItem("token")

    if (storedUser && storedToken) {
      const parsed = JSON.parse(storedUser)
      setUser({
        name: parsed.name,
        email: parsed.email,
        token: storedToken
      })
    }
  }, [])

  return user
}
