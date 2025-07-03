'use client'

import { useState } from 'react'
import { Upload, Download, FileText, AlertCircle, CheckCircle, LogOut } from 'lucide-react'
import { saveAs } from 'file-saver'

interface OperatorDashboardProps {
  user: any
  onLogout: () => void
}

export default function OperatorDashboard({ user, onLogout }: OperatorDashboardProps) {
  const [wordFile, setWordFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleWordUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setWordFile(file)
      setMessage(null)
    }
  }

  const handleProcess = async () => {
    if (!wordFile) {
      setMessage({ type: 'error', text: '请先上传Word文档' })
      return
    }

    setIsProcessing(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('word', wordFile)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/replace', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 下载处理后的文档
        const uint8Array = new Uint8Array(data.data)
        const blob = new Blob([uint8Array], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
        
        saveAs(blob, data.fileName)
        setMessage({ type: 'success', text: '处理完成，文件已下载！' })
        
        // 清除已上传的文件
        setWordFile(null)
        const fileInput = document.getElementById('word-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setMessage({ type: 'error', text: data.error || '处理失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，请重试' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              敏感词替换工具
            </h1>
            <p className="text-gray-600 mt-2">
              欢迎，{user.username}（操作员）
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <LogOut className="mr-2" size={20} />
            退出登录
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Word文件上传 */}
          <div className="space-y-6">
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

          {/* 消息显示 */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg flex items-center ${
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

          {/* 处理按钮 */}
          <div className="text-center mt-8">
            <button
              onClick={handleProcess}
              disabled={!wordFile || isProcessing}
              className={`px-8 py-4 rounded-lg font-semibold text-lg flex items-center mx-auto transition-all ${
                !wordFile || isProcessing
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
                  开始处理
                </>
              )}
            </button>
          </div>

          {/* 使用说明 */}
          <div className="mt-12 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">使用说明：</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>上传需要处理的Word文档(.docx格式)</li>
              <li>点击"开始处理"按钮，系统将自动进行敏感词替换</li>
              <li>处理完成后会自动下载包含两段内容的文档：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>第一段：原文，敏感词用颜色标注</li>
                  <li>第二段：替换后文本，替换词用颜色标注</li>
                </ul>
              </li>
              <li>下载的文件将以"替换后_"为前缀命名</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}