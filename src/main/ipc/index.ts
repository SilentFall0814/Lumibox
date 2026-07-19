import { BrowserWindow } from 'electron';
import { registerLibraryHandlers } from './library';
import { registerAlbumHandlers } from './album';
import { registerImageHandlers } from './image';
import { registerTrashHandlers } from './trash';
import { registerSearchHandlers } from './search';
import { registerUndoHandlers } from './undo';
import { registerViewerHandlers } from './viewer';

export function registerAllHandlers(getMainWindow: () => BrowserWindow | null): void {
  registerLibraryHandlers(getMainWindow);
  registerAlbumHandlers();
  registerImageHandlers();
  registerTrashHandlers();
  registerSearchHandlers();
  registerUndoHandlers();
  registerViewerHandlers();
}
