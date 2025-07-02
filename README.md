# 敏感词替换工具

一个基于Next.js 14的单页Web工具，用于自动完成Word文档中的敏感词替换。支持通过Excel表格导入替换规则。

## 功能特性

- 📊 **Excel替换表支持**: 上传包含原词和替换词的Excel文件
- 📄 **Word文档处理**: 支持.docx格式的Word文档
- 🔄 **自动替换**: 根据Excel表格自动替换Word文档中的敏感词
- 💾 **文件下载**: 处理完成后自动下载替换后的文档
- 🎨 **现代UI**: 基于Tailwind CSS的美观用户界面
- ⚡ **客户端处理**: 所有文件处理在浏览器中完成，保护隐私

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **文件处理**: 
  - Excel: xlsx
  - Word: pizzip + docxtemplater
- **UI组件**: Lucide React icons
- **部署**: Cloudflare Pages (Edge Runtime)

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 访问 [http://localhost:3000](http://localhost:3000)

## 使用说明

1. **准备Excel替换表**：
   - 创建一个Excel文件(.xlsx格式)
   - 第一列：需要替换的原词
   - 第二列：替换后的新词

2. **上传文件**：
   - 上传Excel替换表
   - 上传需要处理的Word文档(.docx格式)

3. **开始替换**：
   - 点击"开始替换"按钮
   - 系统会自动处理并下载替换后的文档

## Excel表格示例

| 原词 | 替换词 |
|------|-------|
| 敏感词1 | 替换词1 |
| 敏感词2 | 替换词2 |
| 敏感词3 | 替换词3 |

## 部署

项目配置为部署在Cloudflare Pages上：

```bash
npm run build
```

构建后的文件可以直接部署到Cloudflare Pages。

## 注意事项

- 仅支持.docx格式的Word文档
- Excel文件支持.xlsx和.xls格式
- 所有文件处理在客户端完成，不会上传到服务器
- 确保Excel表格的第一列是原词，第二列是替换词

## 许可证

MIT License
