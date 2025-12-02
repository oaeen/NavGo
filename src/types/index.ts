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
}

export interface StorageData {
  sites: Site[]
  config: AppConfig
  version: string
}

export interface ExportData {
  version: string
  config: AppConfig
  sites: Omit<Site, 'icon'>[]
}

export const DEFAULT_CONFIG: AppConfig = {
  wallpaper: null,
  searchEngine: 'google'
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
