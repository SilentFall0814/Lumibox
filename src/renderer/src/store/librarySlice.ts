import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Library } from '../../../shared/types';

interface LibraryState {
  libraries: Library[];
  currentLibraryId: number | null;
  initialized: boolean;
  loading: boolean;
}

const initialState: LibraryState = {
  libraries: [],
  currentLibraryId: null,
  initialized: false,
  loading: false
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setCurrentLibrary(state, action: PayloadAction<number | null>) {
      state.currentLibraryId = action.payload;
      state.initialized = action.payload !== null;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    }
  }
});

export const { setCurrentLibrary, setInitialized, setLoading } = librarySlice.actions;
export default librarySlice.reducer;
