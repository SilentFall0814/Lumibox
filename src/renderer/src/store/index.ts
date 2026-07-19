import { configureStore } from '@reduxjs/toolkit';
import libraryReducer from './librarySlice';
import albumsReducer from './albumsSlice';
import imagesReducer from './imagesSlice';
import selectionReducer from './selectionSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    library: libraryReducer,
    albums: albumsReducer,
    images: imagesReducer,
    selection: selectionReducer,
    ui: uiReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
