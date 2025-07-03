import { NextRequest } from 'next/server'
import { getUserById, verifyToken, User } from './database'

export interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'operator'
}

// 从请求中获取用户信息
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return null
    }

    const user = await getUserById(payload.userId)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role
    }
  } catch (error) {
    return null
  }
}

// 检查用户是否有权限
export function hasPermission(user: AuthUser, requiredRole: 'admin' | 'operator'): boolean {
  if (user.role === 'admin') {
    return true // 管理员有所有权限
  }
  
  return user.role === requiredRole
}

// 获取客户端IP地址
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || remoteAddr || 'unknown'
} 