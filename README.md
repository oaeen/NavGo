# NavGO

简洁美观的 Chrome 新标签页扩展，快速访问常用网站。

## 功能特性

- 自定义网站快捷方式（最多 24 个）
- 自动获取网站标题和图标
- 多搜索引擎支持（Google / 百度 / Bing）
- 自定义壁纸背景
- 数据导出导入（支持 ZIP / JSON / GitHub 链接）

## 安装

### 从源码构建

```bash
# 安装依赖
npm install

# 构建扩展
npm run build
```

构建完成后，在 Chrome 中：
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist` 目录

## 开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 技术栈

- Vue 3 + TypeScript
- Vite
- Chrome Extension Manifest V3

## 许可证

MIT
