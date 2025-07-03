import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { promises as fs } from 'fs'
import path from 'path'

// 用户接口
export interface User {
  id: string
  username: string
  password: string
  role: 'admin' | 'operator'
  created_at: string
}

// 敏感词库接口
export interface SensitiveWord {
  id: string
  original: string
  replacement: string
  created_at: string
}

// 操作记录接口
export interface OperationLog {
  id: string
  user_id: string
  operation: string
  details: string
  ip_address: string
  created_at: string
}

interface DatabaseData {
  users: User[]
  sensitive_words: SensitiveWord[]
  operation_logs: OperationLog[]
}

// 数据库文件路径
const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'database.json')

// 默认数据结构
const defaultData: DatabaseData = {
  users: [],
  sensitive_words: [],
  operation_logs: []
}

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

// 从文件读取数据库
async function readDatabase(): Promise<DatabaseData> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(DB_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist or is invalid, return default data
    return { ...defaultData }
  }
}

// 将数据库写入文件
async function writeDatabase(data: DatabaseData): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// 数据库初始化
export async function initDatabase() {
  try {
    const data = await readDatabase()
    
    // Check if admin user exists
    const adminExists = data.users.some(user => user.username === 'admin')
    
    if (!adminExists) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const adminUser: User = {
        id: uuidv4(),
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date().toISOString()
      }
      
      data.users.push(adminUser)
      await writeDatabase(data)
      console.log('Default admin user created: admin/admin123')
    }
    
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}

// 用户操作
export async function createUser(username: string, password: string, role: 'admin' | 'operator' = 'operator'): Promise<boolean> {
  try {
    const data = await readDatabase()
    
    // Check if user already exists
    const userExists = data.users.some(user => user.username === username)
    if (userExists) {
      return false
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser: User = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      role,
      created_at: new Date().toISOString()
    }
    
    data.users.push(newUser)
    await writeDatabase(data)
    return true
  } catch (error) {
    console.error('Create user failed:', error)
    return false
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const data = await readDatabase()
    return data.users.find(user => user.username === username) || null
  } catch (error) {
    console.error('Get user by username failed:', error)
    return null
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const data = await readDatabase()
    return data.users.find(user => user.id === id) || null
  } catch (error) {
    console.error('Get user by ID failed:', error)
    return null
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const data = await readDatabase()
    return data.users
  } catch (error) {
    console.error('Get all users failed:', error)
    return []
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const data = await readDatabase()
    const initialLength = data.users.length
    data.users = data.users.filter(user => user.id !== id)
    
    if (data.users.length < initialLength) {
      await writeDatabase(data)
      return true
    }
    return false
  } catch (error) {
    console.error('Delete user failed:', error)
    return false
  }
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword)
  } catch (error) {
    console.error('Password verification failed:', error)
    return false
  }
}

// 敏感词库操作
export async function getAllSensitiveWords(): Promise<SensitiveWord[]> {
  try {
    const data = await readDatabase()
    return data.sensitive_words
  } catch (error) {
    console.error('Get all sensitive words failed:', error)
    return []
  }
}

export async function addSensitiveWord(original: string, replacement: string): Promise<boolean> {
  try {
    const data = await readDatabase()
    
    const newWord: SensitiveWord = {
      id: uuidv4(),
      original,
      replacement,
      created_at: new Date().toISOString()
    }
    
    data.sensitive_words.push(newWord)
    await writeDatabase(data)
    return true
  } catch (error) {
    console.error('Add sensitive word failed:', error)
    return false
  }
}

export async function clearSensitiveWords(): Promise<boolean> {
  try {
    const data = await readDatabase()
    data.sensitive_words = []
    await writeDatabase(data)
    return true
  } catch (error) {
    console.error('Clear sensitive words failed:', error)
    return false
  }
}

export async function updateSensitiveWords(words: Array<{ original: string; replacement: string }>): Promise<boolean> {
  try {
    const data = await readDatabase()
    
    // Clear existing words and add new ones
    data.sensitive_words = words.map(word => ({
      id: uuidv4(),
      original: word.original,
      replacement: word.replacement,
      created_at: new Date().toISOString()
    }))
    
    await writeDatabase(data)
    return true
  } catch (error) {
    console.error('Update sensitive words failed:', error)
    return false
  }
}

// 操作记录方法
export async function addOperationLog(userId: string, operation: string, details: string, ipAddress: string): Promise<boolean> {
  try {
    const data = await readDatabase()
    
    const newLog: OperationLog = {
      id: uuidv4(),
      user_id: userId,
      operation,
      details,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    }
    
    data.operation_logs.push(newLog)
    await writeDatabase(data)
    return true
  } catch (error) {
    console.error('Add operation log failed:', error)
    return false
  }
}

export async function getAllOperationLogs(): Promise<OperationLog[]> {
  try {
    const data = await readDatabase()
    return data.operation_logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (error) {
    console.error('Get all operation logs failed:', error)
    return []
  }
}

// JWT操作
export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-development'
  return jwt.sign({ userId }, secret, { expiresIn: '24h' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-development'
    const decoded = jwt.verify(token, secret) as { userId: string }
    return decoded
  } catch (error) {
    return null
  }
} 