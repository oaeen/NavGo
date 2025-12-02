export interface Site {
  id: string
  name: string
  url: string
  icon: string | null
  order: number
}

export interface AppConfig {
  wallpaper: string | null
  searchEngine: 'google' | 'baidu' | 'bing'
  showAddButton: boolean
  iconSize: 'small' | 'medium' | 'large'
}

export interface StorageData {
  sites: Site[]
  config: AppConfig
  version: string
}

// 导出数据中的网站配置（icon 为文件路径而非 Base64）
export interface ExportSite {
  id: string
  name: string
  url: string
  icon: string | null  // 导出时为路径如 "icons/xxx.png"
  order: number
}

// 导出数据中的应用配置（wallpaper 为文件路径而非 Base64）
export interface ExportConfig {
  wallpaper: string | null  // 导出时为路径如 "wallpaper.jpg"
  searchEngine: 'google' | 'baidu' | 'bing'
  showAddButton: boolean
  iconSize: 'small' | 'medium' | 'large'
}

export interface ExportData {
  version: string
  config: ExportConfig
  sites: ExportSite[]
}

export const DEFAULT_CONFIG: AppConfig = {
  wallpaper: null,
  searchEngine: 'google',
  showAddButton: true,
  iconSize: 'medium'
}

export const SEARCH_ENGINES = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    icon: 'https://www.google.com/favicon.ico'
  },
  baidu: {
    name: '百度',
    url: 'https://www.baidu.com/s?wd=',
    icon: 'https://www.baidu.com/favicon.ico'
  },
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    icon: 'https://www.bing.com/favicon.ico'
  }
} as const
