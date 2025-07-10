import { NextRequest, NextResponse } from 'next/server'
import { getAllSensitiveWords, clearSensitiveWords, updateSensitiveWords, addOperationLog } from '@/lib/database'
import { getUserFromRequest, hasPermission, getClientIP } from '@/lib/auth'
import { processExcelFile } from '@/lib/fileProcessor'

// 获取敏感词库（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasPermission(user, 'admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const words = await getAllSensitiveWords()
    
    return NextResponse.json({
      success: true,
      words,
      count: words.length
    })

  } catch (error) {
    console.error('获取敏感词库错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 上传更新敏感词库（仅管理员）
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasPermission(user, 'admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const formData = await request.formData()
    const excelFile = formData.get('excel') as File

    if (!excelFile) {
      return NextResponse.json({ error: '请上传Excel文件' }, { status: 400 })
    }

    // 验证文件格式
    if (!excelFile.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: 'Excel文件格式不正确' }, { status: 400 })
    }

    // 处理Excel文件
    const words = await processExcelFile(excelFile)
    
    if (words.length === 0) {
      return NextResponse.json({ error: 'Excel文件中没有找到有效的敏感词数据' }, { status: 400 })
    }

    // 按照敏感词长度排序（长词优先）
    const sortedWords = words.sort((a, b) => b.original.length - a.original.length)

    // 更新敏感词库
    const success = await updateSensitiveWords(sortedWords)
    
    if (!success) {
      return NextResponse.json({ error: '敏感词库更新失败' }, { status: 500 })
    }
    
    // 记录操作日志
    const clientIP = getClientIP(request)
    await addOperationLog(user.id, '更新敏感词库', `上传文件: ${excelFile.name}, 导入 ${words.length} 个敏感词`, clientIP)

    return NextResponse.json({
      success: true,
      message: `敏感词库更新成功，共导入 ${sortedWords.length} 个敏感词`,
      count: sortedWords.length
    })

  } catch (error) {
    console.error('更新敏感词库错误:', error)
    return NextResponse.json({ error: '敏感词库更新失败' }, { status: 500 })
  }
}

// 删除敏感词库（仅管理员）
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !hasPermission(user, 'admin')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 清空敏感词库
    const success = await clearSensitiveWords()
    
    if (!success) {
      return NextResponse.json({ error: '敏感词库删除失败' }, { status: 500 })
    }
    
    // 记录操作日志
    const clientIP = getClientIP(request)
    await addOperationLog(user.id, '删除敏感词库', '清空所有敏感词', clientIP)

    return NextResponse.json({
      success: true,
      message: '敏感词库已清空'
    })

  } catch (error) {
    console.error('删除敏感词库错误:', error)
    return NextResponse.json({ error: '敏感词库删除失败' }, { status: 500 })
  }
} 