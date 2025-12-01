import { create } from 'zustand';

export interface HairStyle {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  length?: 'short' | 'medium' | 'long';
  tags?: string[];
}

export interface SimulationResult {
  id: string;
  customerId?: string;
  originalImageUrl: string;
  resultImageUrl: string;
  selectedStyleId?: string;
  selectedStyle?: HairStyle;
  createdAt: string;
  isFavorite: boolean;
  notes?: string;
}

export interface SimulationRequest {
  sourceImage: string; // base64 or URL
  targetStyleId?: string;
  targetStyleImage?: string;
  customPrompt?: string;
}

interface SimulationState {
  // Current simulation
  sourceImage: string | null;
  selectedStyle: HairStyle | null;
  currentResult: SimulationResult | null;
  isProcessing: boolean;
  // History
  results: SimulationResult[];
  favorites: SimulationResult[];
  // Style library
  styles: HairStyle[];
  styleCategories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  // UI state
  isLoading: boolean;
  error: string | null;
}

interface SimulationActions {
  // Source image
  setSourceImage: (image: string | null) => void;
  captureFromCamera: () => void;
  selectFromGallery: () => void;
  // Style selection
  setSelectedStyle: (style: HairStyle | null) => void;
  setStyles: (styles: HairStyle[]) => void;
  setStyleCategories: (categories: string[]) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  // Simulation
  startSimulation: () => void;
  setCurrentResult: (result: SimulationResult | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  // Results management
  setResults: (results: SimulationResult[]) => void;
  addResult: (result: SimulationResult) => void;
  deleteResult: (resultId: string) => void;
  toggleFavorite: (resultId: string) => void;
  setFavorites: (favorites: SimulationResult[]) => void;
  // State
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  clearCurrentSimulation: () => void;
}

const initialState: SimulationState = {
  sourceImage: null,
  selectedStyle: null,
  currentResult: null,
  isProcessing: false,
  results: [],
  favorites: [],
  styles: [],
  styleCategories: [],
  selectedCategory: null,
  searchQuery: '',
  isLoading: false,
  error: null,
};

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  ...initialState,

  setSourceImage: (sourceImage) =>
    set({ sourceImage, error: null }),

  captureFromCamera: () => {
    // This is a placeholder - actual camera capture should be handled by the component
    // using expo-camera or similar
    console.log('Camera capture triggered');
  },

  selectFromGallery: () => {
    // This is a placeholder - actual gallery selection should be handled by the component
    // using expo-image-picker or similar
    console.log('Gallery selection triggered');
  },

  setSelectedStyle: (selectedStyle) =>
    set({ selectedStyle }),

  setStyles: (styles) =>
    set({ styles }),

  setStyleCategories: (styleCategories) =>
    set({ styleCategories }),

  setSelectedCategory: (selectedCategory) =>
    set({ selectedCategory }),

  setSearchQuery: (searchQuery) =>
    set({ searchQuery }),

  startSimulation: () => {
    const { sourceImage, selectedStyle } = get();
    if (!sourceImage) {
      set({ error: '画像を選択してください' });
      return;
    }
    if (!selectedStyle) {
      set({ error: 'スタイルを選択してください' });
      return;
    }
    set({ isProcessing: true, error: null });
    // Actual simulation is triggered via Edge Function in the component
  },

  setCurrentResult: (currentResult) =>
    set({ currentResult, isProcessing: false }),

  setProcessing: (isProcessing) =>
    set({ isProcessing }),

  setResults: (results) =>
    set({ results }),

  addResult: (result) =>
    set((state) => ({
      results: [result, ...state.results],
      currentResult: result,
    })),

  deleteResult: (resultId) =>
    set((state) => ({
      results: state.results.filter((r) => r.id !== resultId),
      favorites: state.favorites.filter((r) => r.id !== resultId),
      currentResult: state.currentResult?.id === resultId ? null : state.currentResult,
    })),

  toggleFavorite: (resultId) =>
    set((state) => {
      const result = state.results.find((r) => r.id === resultId);
      if (!result) return state;

      const isFavorite = !result.isFavorite;
      const updatedResults = state.results.map((r) =>
        r.id === resultId ? { ...r, isFavorite } : r
      );

      const favorites = isFavorite
        ? [...state.favorites, { ...result, isFavorite: true }]
        : state.favorites.filter((r) => r.id !== resultId);

      return {
        results: updatedResults,
        favorites,
        currentResult: state.currentResult?.id === resultId
          ? { ...state.currentResult, isFavorite }
          : state.currentResult,
      };
    }),

  setFavorites: (favorites) =>
    set({ favorites }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isProcessing: false }),

  reset: () =>
    set(initialState),

  clearCurrentSimulation: () =>
    set({
      sourceImage: null,
      selectedStyle: null,
      currentResult: null,
      isProcessing: false,
      error: null,
    }),
}));

// Helper to filter styles by category and search query
export const useFilteredStyles = () => {
  const { styles, selectedCategory, searchQuery } = useSimulationStore();

  return styles.filter((style) => {
    const matchesCategory = !selectedCategory || style.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });
};
