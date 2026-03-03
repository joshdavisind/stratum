import { create } from 'zustand';
import { MeridiaModel } from './types';
import { defaultModel } from './defaultModel';

interface StoreState {
  model: MeridiaModel;
  jsonText: string;
  parseError: string | null;
  setJsonText: (text: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  model: defaultModel,
  jsonText: JSON.stringify(defaultModel, null, 2),
  parseError: null,
  setJsonText: (text) => {
    try {
      const model = JSON.parse(text) as MeridiaModel;
      set({ model, jsonText: text, parseError: null });
    } catch (e) {
      set({ jsonText: text, parseError: (e as Error).message });
    }
  },
}));
