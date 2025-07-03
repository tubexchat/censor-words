import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername, verifyPassword, generateToken, addOperationLog, initDatabase } from '@/lib/database'
import { getClientIP } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Initialize database if not already done
    await initDatabase()
    
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 })
    }

    const user = await getUserByUsername(username)

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    // 生成token
    const token = generateToken(user.id)
    
    // 记录登录日志
    const clientIP = getClientIP(request)
    await addOperationLog(user.id, '用户登录', `用户 ${user.username} 登录`, clientIP)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })

  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
} 