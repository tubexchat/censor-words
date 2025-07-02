import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const excelFile = formData.get('excel') as File
    const wordFile = formData.get('word') as File

    if (!excelFile || !wordFile) {
      return NextResponse.json({ error: '缺少必要文件' }, { status: 400 })
    }

    // 验证文件格式
    if (!excelFile.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: 'Excel文件格式不正确' }, { status: 400 })
    }

    if (!wordFile.name.match(/\.(docx|doc)$/i)) {
      return NextResponse.json({ error: 'Word文档格式不正确' }, { status: 400 })
    }

    // 返回文件数据供客户端处理
    const excelBuffer = await excelFile.arrayBuffer()
    const wordBuffer = await wordFile.arrayBuffer()

    return NextResponse.json({ 
      success: true,
      excelData: Array.from(new Uint8Array(excelBuffer)),
      wordData: Array.from(new Uint8Array(wordBuffer)),
      excelName: excelFile.name,
      wordName: wordFile.name
    })

  } catch (error) {
    console.error('处理错误:', error)
    return NextResponse.json({ error: '服务器处理错误' }, { status: 500 })
  }
} 