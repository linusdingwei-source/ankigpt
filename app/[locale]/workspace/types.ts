/* eslint-disable @typescript-eslint/no-explicit-any */
export interface WorkspaceViewProps {
  locale: string;
  session: any;
  t: any;
  workspaceT: any;
  cardT: any;
  
  // State
  currentWorkspaceDeck: string;
  credits: number | null;
  paymentSuccess: boolean;
  setPaymentSuccess: (v: boolean) => void;
  
  // Panels
  isSourcePanelCollapsed: boolean;
  setIsSourcePanelCollapsed: (v: boolean) => void;
  isStudioPanelCollapsed: boolean;
  setIsStudioPanelCollapsed: (v: boolean) => void;
  
  // Sources
  sources: any[];
  sourcesLoading: boolean;
  showAddSourceModal: boolean;
  setShowAddSourceModal: (v: boolean) => void;
  showPasteTextModal: boolean;
  setShowPasteTextModal: (v: boolean) => void;
  pastedText: string;
  setPastedText: (v: string) => void;
  showSourceViewModal: boolean;
  setShowSourceViewModal: (v: boolean) => void;
  selectedSourceId: string | null;
  setSelectedSourceId: (v: string | null) => void;
  sourceContent: string;
  setSourceContent: (v: string) => void;
  editingSourceId: string | null;
  setEditingSourceId: (v: string | null) => void;
  editingSourceName: string;
  setEditingSourceName: (v: string) => void;
  showSourceMenuId: string | null;
  setShowSourceMenuId: (v: string | null) => void;
  
  // Chat / Main Area
  preview: any;
  setPreview: (v: any) => void;
  cardText: string;
  setCardText: (v: string) => void;
  cardLoading: boolean;
  cardError: string;
  includePronunciation: boolean;
  setIncludePronunciation: (v: boolean) => void;
  
  // Cards
  cards: any[];
  cardsLoading: boolean;
  cardsError: string;
  total: number;
  totalPages: number;
  page: number;
  setPage: (v: any) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  debouncedSearchQuery: string;
  selectedCardId: string | null;
  setSelectedCardId: (v: any) => void;
  selectedCard: any;
  
  // Handlers
  handleGeneratePreview: () => void;
  handleSaveCard: () => void;
  handleDeleteCard: (id: string) => void;
  generateCardAudio: (card: any) => Promise<void>;
  fetchSources: () => Promise<void>;
  fetchCards: () => Promise<void>;
  handleUploadFile: () => void;
  handleUploadAudio: () => void;
  handlePasteImage: () => void;
  
  sourcePanelWidth: number;
  studioPanelWidth: number;
  startResizingSource: () => void;
  startResizingStudio: () => void;
}
