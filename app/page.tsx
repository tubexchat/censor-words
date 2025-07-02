'use client'

import { useState } from 'react'
import { Upload, Download, FileText, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { saveAs } from 'file-saver'
import { processExcelFile, processWordFile } from '@/lib/fileProcessor'

export default function Home() {
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [wordFile, setWordFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setExcelFile(file)
      setMessage(null)
    }
  }

  const handleWordUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setWordFile(file)
      setMessage(null)
    }
  }

  const handleReplace = async () => {
    if (!excelFile || !wordFile) {
      setMessage({ type: 'error', text: '请先上传Excel替换表和Word文档' })
      return
    }

    setIsProcessing(true)
    setMessage(null)

    try {
      // 处理Excel文件，获取替换映射
      setMessage({ type: 'success', text: '正在解析Excel文件...' })
      const replaceMap = await processExcelFile(excelFile)
      
      if (replaceMap.size === 0) {
        setMessage({ type: 'error', text: 'Excel文件中没有找到有效的替换数据' })
        return
      }

      // 处理Word文档
      setMessage({ type: 'success', text: `找到${replaceMap.size}个替换规则，正在处理Word文档...` })
      const processedBlob = await processWordFile(wordFile, replaceMap)
      
      // 下载处理后的文档
      const fileName = `替换后_${wordFile.name}`
      saveAs(processedBlob, fileName)
      setMessage({ type: 'success', text: '替换完成，文件已下载！' })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理过程中出现错误，请重试'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            敏感词替换工具
          </h1>
          <p className="text-lg text-gray-600">
            自动完成Word文档敏感词替换，支持Excel替换表导入
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Excel文件上传 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FileSpreadsheet className="mr-2" size={24} />
                上传Excel替换表
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600">
                    {excelFile ? excelFile.name : '点击选择Excel文件'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    支持.xlsx, .xls格式
                  </p>
                </label>
              </div>
              {excelFile && (
                <div className="flex items-center text-green-600">
                  <CheckCircle size={16} className="mr-2" />
                  <span className="text-sm">Excel文件已选择</span>
                </div>
              )}
            </div>

            {/* Word文件上传 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FileText className="mr-2" size={24} />
                上传Word文档
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleWordUpload}
                  className="hidden"
                  id="word-upload"
                />
                <label htmlFor="word-upload" className="cursor-pointer">
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600">
                    {wordFile ? wordFile.name : '点击选择Word文档'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    支持.docx, .doc格式
                  </p>
                </label>
              </div>
              {wordFile && (
                <div className="flex items-center text-green-600">
                  <CheckCircle size={16} className="mr-2" />
                  <span className="text-sm">Word文档已选择</span>
                </div>
              )}
            </div>
          </div>

          {/* 消息显示 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="mr-2" size={20} />
              ) : (
                <AlertCircle className="mr-2" size={20} />
              )}
              {message.text}
            </div>
          )}

          {/* 替换按钮 */}
          <div className="text-center">
            <button
              onClick={handleReplace}
              disabled={!excelFile || !wordFile || isProcessing}
              className={`px-8 py-4 rounded-lg font-semibold text-lg flex items-center mx-auto transition-all ${
                !excelFile || !wordFile || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  处理中...
                </>
              ) : (
                <>
                  <Download className="mr-2" size={20} />
                  开始替换
                </>
              )}
            </button>
          </div>

          {/* 使用说明 */}
          <div className="mt-12 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">使用说明：</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>准备一个Excel文件，包含两列：第一列为原词，第二列为替换词</li>
              <li>上传需要处理的Word文档(.docx格式)</li>
              <li>点击"开始替换"按钮，系统将自动处理并下载替换后的文档</li>
              <li>下载的文件将以"替换后_"为前缀命名</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
} 