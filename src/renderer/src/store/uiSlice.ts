import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type View = 'library' | 'album' | 'trash' | 'search' | 'about';

export type ThemeMode = 'light' | 'dark' | 'auto';

// 排序方式:newest(最新优先)/oldest(最旧优先)/name(按名称)/size(按大小)
export type SortKey = 'newest' | 'oldest' | 'name' | 'size';

// 显示视图:grid(网格)/list(列表)
export type ViewMode = 'grid' | 'list';

interface UiState {
  currentView: View;
  currentPath: string;
  selectedAlbum: string | null;
  searchQuery: string;
  fullscreenImageId: number | null;
  scanProgress: { current: number; total: number } | null;
  // 图片列表重载信号:每次 dispatch triggerReload 递增,ImageGrid 监听变化后重载
  // 用于跨组件触发刷新(如把图片拖到相册后,源目录需移除这些图片)
  reloadNonce: number;
  // 多选模式开关:开启后单击不会立即打开图片,而是累加选择
  multiSelectMode: boolean;
  // 主题模式:light/dark/auto(跟随系统)
  theme: ThemeMode;
  // 排序方式(全局,TopBar 控制,ImageGrid 读取)
  sortKey: SortKey;
  // 显示视图(网格 / 列表)
  viewMode: ViewMode;
}

const initialState: UiState = {
  currentView: 'library',
  currentPath: '',
  selectedAlbum: null,
  searchQuery: '',
  fullscreenImageId: null,
  scanProgress: null,
  reloadNonce: 0,
  multiSelectMode: false,
  theme: 'auto',
  sortKey: 'newest',
  viewMode: 'grid'
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setView(state, action: PayloadAction<View>) {
      state.currentView = action.payload;
    },
    setCurrentPath(state, action: PayloadAction<string>) {
      state.currentPath = action.payload;
    },
    setSelectedAlbum(state, action: PayloadAction<string | null>) {
      state.selectedAlbum = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setFullscreenImage(state, action: PayloadAction<number | null>) {
      state.fullscreenImageId = action.payload;
    },
    setScanProgress(state, action: PayloadAction<{ current: number; total: number } | null>) {
      state.scanProgress = action.payload;
    },
    triggerReload(state) {
      state.reloadNonce += 1;
    },
    setMultiSelectMode(state, action: PayloadAction<boolean>) {
      state.multiSelectMode = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    setSortKey(state, action: PayloadAction<SortKey>) {
      state.sortKey = action.payload;
    },
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
    }
  }
});

export const {
  setView, setCurrentPath, setSelectedAlbum,
  setSearchQuery, setFullscreenImage, setScanProgress, triggerReload,
  setMultiSelectMode, setTheme, setSortKey, setViewMode
} = uiSlice.actions;
export default uiSlice.reducer;
