'use client'

import { useState, useEffect } from 'react'
import { 
  Upload, Download, FileText, AlertCircle, CheckCircle, LogOut, 
  Users, FileSpreadsheet, History, Plus, Trash2, Eye, EyeOff 
} from 'lucide-react'
import { saveAs } from 'file-saver'

interface AdminDashboardProps {
  user: any
  onLogout: () => void
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('process')
  const [wordFile, setWordFile] = useState<File | null>(null)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // 用户管理相关
  const [users, setUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator' })
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  
  // 敏感词库相关
  const [sensitiveWords, setSensitiveWords] = useState<any[]>([])
  const [isLoadingWords, setIsLoadingWords] = useState(false)
  
  // 操作日志相关
  const [logs, setLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  })

  // 页面加载时获取数据
  useEffect(() => {
    if (activeTab === 'words') {
      loadSensitiveWords()
    } else if (activeTab === 'users') {
      loadUsers()
    } else if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab])

  // 处理Word文档
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

      const response = await fetch('/api/replace', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const uint8Array = new Uint8Array(data.data)
        const blob = new Blob([uint8Array], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
        
        saveAs(blob, data.fileName)
        setMessage({ type: 'success', text: '处理完成，文件已下载！' })
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

  // 管理敏感词库
  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setExcelFile(file)
    }
  }

  const uploadSensitiveWords = async () => {
    if (!excelFile) {
      setMessage({ type: 'error', text: '请先选择Excel文件' })
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('excel', excelFile)

      const response = await fetch('/api/sensitive-words', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: data.message })
        setExcelFile(null)
        const fileInput = document.getElementById('excel-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        loadSensitiveWords()
      } else {
        setMessage({ type: 'error', text: data.error || '上传失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，请重试' })
    } finally {
      setIsProcessing(false)
    }
  }

  const loadSensitiveWords = async () => {
    setIsLoadingWords(true)
    try {
      const response = await fetch('/api/sensitive-words', {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setSensitiveWords(data.words)
      }
    } catch (error) {
      console.error('加载敏感词库失败:', error)
    } finally {
      setIsLoadingWords(false)
    }
  }

  const deleteSensitiveWords = async () => {
    if (!confirm('确认删除整个敏感词库？此操作不可恢复！')) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch('/api/sensitive-words', {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: data.message })
        setSensitiveWords([])
      } else {
        setMessage({ type: 'error', text: data.error || '删除失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，请重试' })
    } finally {
      setIsProcessing(false)
    }
  }

  // 用户管理
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  }

  const createUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(newUser)
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setNewUser({ username: '', password: '', role: 'operator' })
        setShowNewUserForm(false)
        loadUsers()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '创建用户失败' })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('确认删除该用户？')) return

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        loadUsers()
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '删除用户失败' })
    }
  }

  // 操作日志
  const loadLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const response = await fetch('/api/logs', {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('加载操作日志失败:', error)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    } else if (activeTab === 'words') {
      loadSensitiveWords()
    } else if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab])

  const renderProcessTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center">
        <FileText className="mr-2" size={24} />
        处理Word文档
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

      <div className="text-center">
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
    </div>
  )

  const renderWordsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <FileSpreadsheet className="mr-2" size={24} />
          敏感词库管理
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            当前词库数量: {sensitiveWords.length}
          </span>
          {sensitiveWords.length > 0 && (
            <button
              onClick={deleteSensitiveWords}
              disabled={isProcessing}
              className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
            >
              <Trash2 className="mr-1" size={14} />
              清空词库
            </button>
          )}
        </div>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center mb-4">
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
              {excelFile ? excelFile.name : '点击选择Excel敏感词库文件'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              第一列：敏感词，第二列：替换词<br/>
              上传后将自动按敏感词长度排序（长词优先替换）
            </p>
          </label>
        </div>
        
        {excelFile && (
          <div className="text-center">
            <button
              onClick={uploadSensitiveWords}
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              {isProcessing ? '上传中...' : '更新敏感词库'}
            </button>
          </div>
        )}
      </div>

      {isLoadingWords ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">当前敏感词库：</h3>
            {sensitiveWords.length > 0 && (
              <span className="text-xs text-gray-400">已按词长排序（长词优先）</span>
            )}
          </div>
          {sensitiveWords.length === 0 ? (
            <p className="text-gray-500">暂无敏感词</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sensitiveWords.map((word, index) => (
                <div key={index} className="bg-white p-2 rounded border text-sm">
                  <span className="text-red-600 font-medium">{word.original}</span>
                  <span className="mx-2">→</span>
                  <span className="text-green-600">{word.replacement}</span>
                  <span className="text-xs text-gray-400 ml-2">({word.original.length}字)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Users className="mr-2" size={24} />
          用户管理
        </h2>
        <button
          onClick={() => setShowNewUserForm(!showNewUserForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="mr-2" size={16} />
          添加用户
        </button>
      </div>

      {showNewUserForm && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-4">创建新用户</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="用户名"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="password"
              placeholder="密码"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="operator">操作员</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={createUser}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              创建
            </button>
            <button
              onClick={() => setShowNewUserForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">用户名</th>
              <th className="px-4 py-3 text-left">角色</th>
              <th className="px-4 py-3 text-left">创建时间</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role === 'admin' ? '管理员' : '操作员'}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {u.id !== user.id && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderLogsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center">
        <History className="mr-2" size={24} />
        操作日志
      </h2>

      {isLoadingLogs ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">时间</th>
                  <th className="px-4 py-3 text-left">用户</th>
                  <th className="px-4 py-3 text-left">操作</th>
                  <th className="px-4 py-3 text-left">文件</th>
                  <th className="px-4 py-3 text-left">IP地址</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">{log.username}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.fileName || '-'}</td>
                    <td className="px-4 py-3 text-sm">{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              敏感词替换管理系统
            </h1>
            <p className="text-gray-600 mt-2">
              欢迎，{user.username}（管理员）
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

        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'process', name: '文档处理', icon: FileText },
                { id: 'words', name: '敏感词库', icon: FileSpreadsheet },
                { id: 'users', name: '用户管理', icon: Users },
                { id: 'logs', name: '操作日志', icon: History }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="mr-2" size={16} />
                  {tab.name}
                </button>
              ))}
            </nav>
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

        {/* 内容区域 */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {activeTab === 'process' && renderProcessTab()}
          {activeTab === 'words' && renderWordsTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'logs' && renderLogsTab()}
        </div>
      </div>
    </div>
  )
} 