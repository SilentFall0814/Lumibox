import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import ImageGrid from '../image/ImageGrid';
import TrashView from '../trash/TrashView';
import AboutPage from '../about/AboutPage';
import FullscreenViewer from '../viewer/FullscreenViewer';

/**
 * 应用主框架 - 设计稿布局:
 * - Sidebar 在最左侧(220px 毛玻璃,跨满高度)
 * - 右侧主区域:flex-col[TopBar 52px + 内容区]
 * - 关于页特殊处理:不显示 Sidebar/TopBar/RightPanel,占满全屏
 */
export default function AppShell() {
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const fullscreenImageId = useSelector((s: RootState) => s.ui.fullscreenImageId);

  // 关于页 - 全屏布局,不显示侧栏与顶栏
  if (currentView === 'about') {
    return (
      <div className="h-full w-full overflow-hidden bg-background">
        <AboutPage />
        {fullscreenImageId !== null && <FullscreenViewer />}
      </div>
    );
  }

  // 标准布局:Sidebar 左 + (TopBar 上 + 内容区 下)右
  return (
    <div className="h-full w-full overflow-hidden flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-hidden">
            <div key={currentView} className="h-full view-transition">
              {currentView === 'trash' ? <TrashView /> : <ImageGrid />}
            </div>
          </main>
          <RightPanel />
        </div>
      </div>
      {fullscreenImageId !== null && <FullscreenViewer />}
    </div>
  );
}
