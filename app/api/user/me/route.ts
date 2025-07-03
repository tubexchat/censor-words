import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

// 获取当前用户信息
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })

  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
} 