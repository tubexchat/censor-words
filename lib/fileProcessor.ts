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
  
  // 首先找到所有需要替换的位置（基于原始文本）
  for (const word of sortedWords) {
    const regex = new RegExp(escapeRegExp(word.original), 'g')
    let match: RegExpExecArray | null
    
    while ((match = regex.exec(text)) !== null) {
      // 检查这个位置是否已经被其他更长的词替换了
      const isAlreadyReplaced = replacements.some(existing => {
        const existingEnd = existing.position + existing.original.length
        const currentEnd = match!.index + word.original.length
        return (match!.index < existingEnd && currentEnd > existing.position)
      })
      
      if (!isAlreadyReplaced) {
        replacements.push({
          original: word.original,
          replacement: word.replacement,
          position: match.index
        })
      }
    }
  }
  
  // 按位置排序（从后往前，这样不会影响前面的位置）
  replacements.sort((a, b) => b.position - a.position)
  
  // 执行替换
  for (const replacement of replacements) {
    replacedText = replacedText.substring(0, replacement.position) + 
                  replacement.replacement + 
                  replacedText.substring(replacement.position + replacement.original.length)
  }
  
  // 重新按位置排序（从前往后）
  replacements.sort((a, b) => a.position - b.position)
  
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
  
  // 预计算每行在原文中的位置
  let globalOffset = 0
  const linePositions: Array<{line: string, start: number, end: number}> = []
  
  for (const line of lines) {
    linePositions.push({
      line: line,
      start: globalOffset,
      end: globalOffset + line.length
    })
    globalOffset += line.length + 1 // +1 for the newline character
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const linePosition = linePositions[i]
    
    if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: "" }))
      continue
    }
    
    const textRuns: TextRun[] = []
    let currentIndex = 0
    
    // 找到这一行中的所有替换
    const lineReplacements: Array<{
      original: string
      replacement: string
      position: number
      lineRelativePos: number
      searchText: string
    }> = []
    
    for (const replacement of replacements) {
      let wordPosition = -1
      let searchText = ''
      
      if (isOriginal) {
        // 对于原文，查找敏感词在该行中的位置
        searchText = replacement.original
        // 检查该敏感词是否在当前行中
        if (replacement.position >= linePosition.start && replacement.position < linePosition.end) {
          wordPosition = replacement.position - linePosition.start
        }
      } else {
        // 对于替换后文本，查找替换词在该行中的位置
        searchText = replacement.replacement
        // 计算替换词在替换后文本中的大致位置
        // 这里需要考虑之前的替换对位置的影响
        let adjustedPos = replacement.position
        
        // 计算位置偏移（由于之前的替换造成的长度变化）
        for (const prevReplacement of replacements) {
          if (prevReplacement.position < replacement.position) {
            const lengthDiff = prevReplacement.replacement.length - prevReplacement.original.length
            adjustedPos += lengthDiff
          }
        }
        
        // 检查调整后的位置是否在当前行中
        if (adjustedPos >= linePosition.start && adjustedPos < linePosition.end) {
          wordPosition = adjustedPos - linePosition.start
        }
      }
      
      if (wordPosition >= 0) {
        // 验证文本是否真的在该位置
        if (line.substring(wordPosition, wordPosition + searchText.length) === searchText) {
          lineReplacements.push({
            original: replacement.original,
            replacement: replacement.replacement,
            position: replacement.position,
            lineRelativePos: wordPosition,
            searchText: searchText
          })
        } else {
          // 如果位置不匹配，尝试在该行中搜索
          const searchIndex = line.indexOf(searchText)
          if (searchIndex !== -1) {
            lineReplacements.push({
              original: replacement.original,
              replacement: replacement.replacement,
              position: replacement.position,
              lineRelativePos: searchIndex,
              searchText: searchText
            })
          }
        }
      }
    }
    
    // 按行内位置排序，避免重叠
    lineReplacements.sort((a, b) => a.lineRelativePos - b.lineRelativePos)
    
    // 去重，避免重叠的高亮
    const uniqueReplacements: typeof lineReplacements = []
    for (const replacement of lineReplacements) {
      const endPos = replacement.lineRelativePos + replacement.searchText.length
      const isOverlapping = uniqueReplacements.some(existing => {
        const existingEnd = existing.lineRelativePos + existing.searchText.length
        return (replacement.lineRelativePos < existingEnd && endPos > existing.lineRelativePos)
      })
      
      if (!isOverlapping) {
        uniqueReplacements.push(replacement)
      }
    }
    
    for (const replacement of uniqueReplacements) {
      const searchIndex = replacement.lineRelativePos
      
      if (searchIndex >= currentIndex) {
        // 添加普通文本（如果有）
        if (searchIndex > currentIndex) {
          textRuns.push(new TextRun({
            text: line.substring(currentIndex, searchIndex)
          }))
        }
        
        // 添加高亮文本
        textRuns.push(new TextRun({
          text: replacement.searchText,
          bold: true,
          color: isOriginal ? "FF0000" : "008000", // 红色：敏感词，绿色：替换词
          highlight: isOriginal ? "yellow" : "green"
        }))
        
        currentIndex = searchIndex + replacement.searchText.length
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