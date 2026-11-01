import { create } from 'zustand';

export interface DocumentInfo {
  id: string;
  filename: string;
  size_bytes: number;
  uploaded_at: string;
  chunks_count?: number;
}

interface DocumentState {
  documents: DocumentInfo[];
  selectedDocumentId: string | null;
  loading: boolean;
  setDocuments: (documents: DocumentInfo[]) => void;
  setSelectedDocumentId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  selectedDocumentId: null,
  loading: false,
  setDocuments: (documents) => set({ documents }),
  setSelectedDocumentId: (selectedDocumentId) => set({ selectedDocumentId }),
  setLoading: (loading) => set({ loading }),
}));
