import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import ImageGrid from '../image/ImageGrid';
import TrashView from '../trash/TrashView';
import FullscreenViewer from '../viewer/FullscreenViewer';

export default function AppShell() {
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const fullscreenImageId = useSelector((s: RootState) => s.ui.fullscreenImageId);

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {currentView === 'trash' ? <TrashView /> : <ImageGrid />}
        </main>
        <RightPanel />
      </div>
      {fullscreenImageId !== null && <FullscreenViewer />}
    </div>
  );
}
