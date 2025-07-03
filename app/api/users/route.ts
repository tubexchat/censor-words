import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser, deleteUser, getUserByUsername, getUserById, addOperationLog } from '@/lib/database'
import { getUserFromRequest, hasPermission, getClientIP } from '@/lib/auth'

// 获取所有用户（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasPermission(user, 'admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const users = await getAllUsers()
    
    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        created_at: u.created_at
      }))
    })

  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 创建新用户（仅管理员）
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasPermission(user, 'admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const { username, password, role } = await request.json()

    if (!username || !password || !role) {
      return NextResponse.json({ error: '用户名、密码和角色不能为空' }, { status: 400 })
    }

    if (!['admin', 'operator'].includes(role)) {
      return NextResponse.json({ error: '无效的用户角色' }, { status: 400 })
    }

    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 })
    }

    // 创建新用户
    const success = await createUser(username, password, role)
    
    if (!success) {
      return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
    }
    
    // 记录操作日志
    const clientIP = getClientIP(request)
    await addOperationLog(user.id, '创建用户', `创建用户: ${username}`, clientIP)

    return NextResponse.json({
      success: true,
      message: '用户创建成功'
    })

  } catch (error) {
    console.error('创建用户错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 删除用户（仅管理员）
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasPermission(user, 'admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('id')

    if (!targetUserId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 })
    }

    // 不能删除自己
    if (targetUserId === user.id) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 })
    }

    const targetUser = await getUserById(targetUserId)
    
    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const success = await deleteUser(targetUserId)
    
    if (success) {
      // 记录操作日志
      const clientIP = getClientIP(request)
      await addOperationLog(user.id, '删除用户', `删除用户: ${targetUser.username}`, clientIP)
      
      return NextResponse.json({
        success: true,
        message: '用户删除成功'
      })
    } else {
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

  } catch (error) {
    console.error('删除用户错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
} 