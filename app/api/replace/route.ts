import { NextRequest, NextResponse } from 'next/server'
import { getAllSensitiveWords, addOperationLog } from '@/lib/database'
import { getUserFromRequest, getClientIP } from '@/lib/auth'
import { processWordFile } from '@/lib/fileProcessor'

export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await request.formData()
    const wordFile = formData.get('word') as File

    if (!wordFile) {
      return NextResponse.json({ error: '请上传Word文档' }, { status: 400 })
    }

    // 验证文件格式
    if (!wordFile.name.match(/\.(docx|doc)$/i)) {
      return NextResponse.json({ error: 'Word文档格式不正确' }, { status: 400 })
    }

    // 获取敏感词库
    const words = await getAllSensitiveWords()
    if (words.length === 0) {
      return NextResponse.json({ error: '敏感词库为空，请联系管理员上传敏感词库' }, { status: 400 })
    }

    // 转换为处理格式
    const wordsForProcessing = words.map(w => ({
      original: w.original,
      replacement: w.replacement
    }))

    // 处理Word文档
    const processedBlob = await processWordFile(wordFile, wordsForProcessing)
    
    // 将Blob转换为ArrayBuffer再转换为Array供客户端下载
    const arrayBuffer = await processedBlob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // 记录操作日志
    const clientIP = getClientIP(request)
    console.log('📝 准备记录操作日志:', {
      userId: user.id,
      username: user.username,
      fileName: wordFile.name,
      ip: clientIP
    })
    
    const logSuccess = await addOperationLog(user.id, '处理Word文档', `处理文件: ${wordFile.name}`, clientIP)
    
    if (logSuccess) {
      console.log('✅ 操作日志记录成功')
    } else {
      console.error('❌ 操作日志记录失败')
    }

    return NextResponse.json({
      success: true,
      data: Array.from(uint8Array),
      fileName: `替换后_${wordFile.name}`,
      message: '文档处理完成'
    })

  } catch (error) {
    console.error('处理错误:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '服务器处理错误' 
    }, { status: 500 })
  }
} 