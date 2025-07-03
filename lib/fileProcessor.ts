import * as XLSX from 'xlsx'
import PizZip from 'pizzip'
import mammoth from 'mammoth'

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
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
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

        resolve(words)
      } catch (error) {
        reject(new Error('Excel文件解析失败'))
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
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

// 生成包含两段内容的Word文档HTML
function generateDocumentHTML(originalText: string, replacedText: string, replacements: Array<{original: string, replacement: string, position: number}>): string {
  // 为原文添加颜色标注
  let highlightedOriginal = originalText
  const sortedReplacements = [...replacements].sort((a, b) => b.position - a.position)
  
  for (const replacement of sortedReplacements) {
    const start = replacement.position
    const end = start + replacement.original.length
    const highlighted = `<span style="background-color: #ffeb3b; color: #d32f2f; font-weight: bold;">${replacement.original}</span>`
    
    highlightedOriginal = highlightedOriginal.substring(0, start) + 
                         highlighted + 
                         highlightedOriginal.substring(end)
  }
  
  // 为替换后的文本添加颜色标注
  let highlightedReplaced = replacedText
  let offset = 0
  
  for (const replacement of replacements) {
    const start = replacement.position + offset
    const end = start + replacement.replacement.length
    const highlighted = `<span style="background-color: #c8e6c9; color: #2e7d32; font-weight: bold;">${replacement.replacement}</span>`
    
    highlightedReplaced = highlightedReplaced.substring(0, start) + 
                         highlighted + 
                         highlightedReplaced.substring(end)
    
    offset += highlighted.length - replacement.replacement.length
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>敏感词替换结果</title>
      <style>
        body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .section { margin-bottom: 40px; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #333; }
        .content { padding: 20px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
        .original { border-left: 4px solid #f44336; }
        .replaced { border-left: 4px solid #4caf50; }
      </style>
    </head>
    <body>
      <div class="section">
        <div class="title">原文（敏感词标注）：</div>
        <div class="content original">${highlightedOriginal}</div>
      </div>
      
      <div class="section">
        <div class="title">替换后（替换词标注）：</div>
        <div class="content replaced">${highlightedReplaced}</div>
      </div>
    </body>
    </html>
  `
}

// 处理Word文档，进行敏感词替换
export async function processWordFile(file: File, words: Array<{original: string, replacement: string}>): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        
        // 使用mammoth提取文本内容
        const result = await mammoth.extractRawText({arrayBuffer})
        const text = result.value
        
        if (!text.trim()) {
          reject(new Error('Word文档中没有找到可读取的文本内容'))
          return
        }
        
        // 执行敏感词替换
        const replacementResult = replaceWordsInText(text, words)
        
        if (replacementResult.replacements.length === 0) {
          reject(new Error('文档中没有找到需要替换的敏感词'))
          return
        }
        
        // 生成包含两段内容的HTML
        const htmlContent = generateDocumentHTML(
          replacementResult.originalText,
          replacementResult.replacedText,
          replacementResult.replacements
        )
        
        // 转换为Word文档格式的Blob
        const blob = new Blob([htmlContent], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
        
        console.log(`替换完成，共替换了 ${replacementResult.replacements.length} 个敏感词`)
        resolve(blob)
        
      } catch (error) {
        console.error('Word文档处理错误:', error)
        reject(new Error('Word文档处理失败'))
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
} 