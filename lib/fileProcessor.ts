import * as XLSX from 'xlsx'
import PizZip from 'pizzip'

// 处理Excel文件，提取替换映射
export async function processExcelFile(file: File): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const replaceMap = new Map<string, string>()
        for (const row of sheetData) {
          if (row.length >= 2 && row[0] && row[1]) {
            replaceMap.set(row[0].toString().trim(), row[1].toString().trim())
          }
        }

        resolve(replaceMap)
      } catch (error) {
        reject(new Error('Excel文件解析失败'))
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 处理Word文档，进行敏感词替换
export async function processWordFile(file: File, replaceMap: Map<string, string>): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const zip = new PizZip(arrayBuffer)

        // 读取文档内容
        let content = zip.file('word/document.xml')?.asText()
        if (!content) {
          reject(new Error('无法读取Word文档内容'))
          return
        }

        // 执行替换
        let replacedCount = 0
        replaceMap.forEach((replacement, original) => {
          const regex = new RegExp(escapeRegExp(original), 'g')
          const matches = content!.match(regex)
          if (matches) {
            content = content!.replace(regex, replacement)
            replacedCount += matches.length
          }
        })

        // 更新文档内容
        zip.file('word/document.xml', content)

        // 生成新的Word文档
        const newBuffer = zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        
        console.log(`替换完成，共替换了 ${replacedCount} 个词`)
        resolve(newBuffer)
      } catch (error) {
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