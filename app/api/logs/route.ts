import { NextRequest, NextResponse } from 'next/server'
import { getAllOperationLogs, getUserById } from '@/lib/database'
import { getUserFromRequest, hasPermission } from '@/lib/auth'

// 获取操作日志（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasPermission(user, 'admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const logs = await getAllOperationLogs()
    
    // 为每个日志添加用户名信息
    const logsWithUsernames = await Promise.all(
      logs.map(async (log) => {
        const logUser = await getUserById(log.user_id)
        return {
          id: log.id,
          timestamp: log.created_at,
          username: logUser ? logUser.username : '未知用户',
          action: log.operation,
          details: log.details,
          fileName: extractFileName(log.details),
          ipAddress: log.ip_address
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      logs: logsWithUsernames
    })

  } catch (error) {
    console.error('获取操作日志错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 从详情中提取文件名
function extractFileName(details: string): string | null {
  // 处理文件相关的操作
  if (details.includes('处理文件:')) {
    const match = details.match(/处理文件:\s*(.+)/)
    return match ? match[1] : null
  }
  if (details.includes('上传文件:')) {
    const match = details.match(/上传文件:\s*([^,]+)/)
    return match ? match[1] : null
  }
  return null
} 