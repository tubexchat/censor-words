import * as XLSX from 'xlsx'
import PizZip from 'pizzip'
import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export interface ReplacementResult {
  originalText: string
  replacedText: string
  replacements: Array<{
    original: string
    replacement: string
    position: number
  }>
}

// 处理Excel文件，提取替换映射
export async function processExcelFile(file: File): Promise<Array<{original: string, replacement: string}>> {
  try {
    // 在服务器端使用 file.arrayBuffer() 而不是 FileReader
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    const words: Array<{original: string, replacement: string}> = []
    for (const row of sheetData) {
      if (row.length >= 2 && row[0] && row[1]) {
        words.push({
          original: row[0].toString().trim(),
          replacement: row[1].toString().trim()
        })
      }
    }

    return words
  } catch (error) {
    throw new Error('Excel文件解析失败')
  }
}

// 按字数长度排序敏感词（长的优先）
function sortWordsByLength(words: Array<{original: string, replacement: string}>): Array<{original: string, replacement: string}> {
  return words.sort((a, b) => b.original.length - a.original.length)
}

// 执行敏感词替换，返回替换结果
export function replaceWordsInText(text: string, words: Array<{original: string, replacement: string}>): ReplacementResult {
  const sortedWords = sortWordsByLength(words)
  let replacedText = text
  const replacements: Array<{original: string, replacement: string, position: number}> = []
  
  for (const word of sortedWords) {
    const regex = new RegExp(escapeRegExp(word.original), 'g')
    let match
    
    while ((match = regex.exec(replacedText)) !== null) {
      replacements.push({
        original: word.original,
        replacement: word.replacement,
        position: match.index
      })
      
      // 替换找到的词
      replacedText = replacedText.substring(0, match.index) + 
                   word.replacement + 
                   replacedText.substring(match.index + word.original.length)
      
      // 重置正则表达式的lastIndex，因为字符串已经改变
      regex.lastIndex = match.index + word.replacement.length
    }
  }
  
  return {
    originalText: text,
    replacedText,
    replacements
  }
}

// 生成包含两段内容的Word文档
function generateWordDocument(originalText: string, replacedText: string, replacements: Array<{original: string, replacement: string, position: number}>): Document {
  const children: Paragraph[] = []
  
  // 添加标题
  children.push(
    new Paragraph({
      text: "敏感词替换结果",
      heading: HeadingLevel.TITLE,
    })
  )
  
  // 添加原文部分标题
  children.push(
    new Paragraph({
      text: "原文（敏感词标注）：",
      heading: HeadingLevel.HEADING_1,
    })
  )
  
  // 生成原文段落，高亮敏感词
  const originalParagraphs = generateHighlightedParagraphs(originalText, replacements, true)
  children.push(...originalParagraphs)
  
  // 添加空行
  children.push(new Paragraph({ text: "" }))
  
  // 添加替换后文本部分标题
  children.push(
    new Paragraph({
      text: "替换后（替换词标注）：",
      heading: HeadingLevel.HEADING_1,
    })
  )
  
  // 生成替换后段落，高亮替换词
  const replacedParagraphs = generateHighlightedParagraphs(replacedText, replacements, false)
  children.push(...replacedParagraphs)
  
  return new Document({
    sections: [{
      properties: {},
      children: children
    }]
  })
}

// 生成带高亮的段落
function generateHighlightedParagraphs(text: string, replacements: Array<{original: string, replacement: string, position: number}>, isOriginal: boolean): Paragraph[] {
  const lines = text.split('\n')
  const paragraphs: Paragraph[] = []
  
  for (const line of lines) {
    if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: "" }))
      continue
    }
    
    const textRuns: TextRun[] = []
    let currentIndex = 0
    
    // 找到这一行中的所有替换
    const lineReplacements = replacements.filter(replacement => {
      const lineStart = text.indexOf(line)
      const lineEnd = lineStart + line.length
      const replPos = isOriginal ? replacement.position : 
        text.indexOf(replacement.replacement, replacement.position)
      return replPos >= lineStart && replPos < lineEnd
    })
    
    // 按位置排序
    lineReplacements.sort((a, b) => {
      const posA = isOriginal ? a.position : text.indexOf(a.replacement, a.position)
      const posB = isOriginal ? b.position : text.indexOf(b.replacement, b.position)
      return posA - posB
    })
    
    for (const replacement of lineReplacements) {
      const searchText = isOriginal ? replacement.original : replacement.replacement
      const searchIndex = line.indexOf(searchText, currentIndex)
      
      if (searchIndex !== -1) {
        // 添加普通文本（如果有）
        if (searchIndex > currentIndex) {
          textRuns.push(new TextRun({
            text: line.substring(currentIndex, searchIndex)
          }))
        }
        
        // 添加高亮文本
        textRuns.push(new TextRun({
          text: searchText,
          bold: true,
          color: isOriginal ? "FF0000" : "008000", // 红色：敏感词，绿色：替换词
          highlight: isOriginal ? "yellow" : "green"
        }))
        
        currentIndex = searchIndex + searchText.length
      }
    }
    
    // 添加剩余的普通文本
    if (currentIndex < line.length) {
      textRuns.push(new TextRun({
        text: line.substring(currentIndex)
      }))
    }
    
    // 如果没有高亮内容，添加整行文本
    if (textRuns.length === 0) {
      textRuns.push(new TextRun({ text: line }))
    }
    
    paragraphs.push(new Paragraph({
      children: textRuns
    }))
  }
  
  return paragraphs
}

// 处理Word文档，进行敏感词替换
export async function processWordFile(file: File, words: Array<{original: string, replacement: string}>): Promise<Blob> {
  try {
    // 在服务器端使用 file.arrayBuffer() 而不是 FileReader
    const arrayBuffer = await file.arrayBuffer()
    
    // 将ArrayBuffer转换为Buffer（Node.js环境需要）
    const buffer = Buffer.from(arrayBuffer)
    
    // 使用mammoth提取文本内容
    const result = await mammoth.extractRawText({
      buffer: buffer
    })
    const text = result.value
    
    if (!text.trim()) {
      throw new Error('Word文档中没有找到可读取的文本内容')
    }
    
    // 执行敏感词替换
    const replacementResult = replaceWordsInText(text, words)
    
    if (replacementResult.replacements.length === 0) {
      throw new Error('文档中没有找到需要替换的敏感词')
    }
    
    // 生成包含两段内容的Word文档
    const doc = generateWordDocument(
      replacementResult.originalText,
      replacementResult.replacedText,
      replacementResult.replacements
    )
    
    // 转换为Word文档格式的Blob
    const docBuffer = await Packer.toBuffer(doc)
    const blob = new Blob([docBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    
    console.log(`替换完成，共替换了 ${replacementResult.replacements.length} 个敏感词`)
    return blob
    
  } catch (error) {
    console.error('Word文档处理错误:', error)
    throw new Error('Word文档处理失败')
  }
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
} 