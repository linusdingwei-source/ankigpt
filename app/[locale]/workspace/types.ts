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
  activeStudioTab: 'WORD' | 'SENTENCE' | 'NOTE';
  setActiveStudioTab: (v: 'WORD' | 'SENTENCE' | 'NOTE') => void;
  
  // Sources
  sources: any[];
  sourcesLoading: boolean;
  uploadProgress: {
    phase: 'splitting' | 'uploading' | null;
    current: number;
    total: number;
    fileName?: string;
  };
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
  viewingSourceId: string | null;
  setViewingSourceId: (v: string | null) => void;
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
  
  // PDF Generation
  isPdfGenerating: boolean;
  onCancelPdfGeneration: () => void;
  
  // Card Generation
  isCardGenerating: boolean;
  onCancelCardGeneration: () => void;
  
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
  showCardMenuId: string | null;
  setShowCardMenuId: (v: string | null) => void;
  
  // Comparison view for notes
  showComparisonView: boolean;
  setShowComparisonView: (v: boolean) => void;
  comparisonSource: any;
  
  // Handlers
  handleGeneratePreview: () => void;
  handleSaveCard: () => void;
  handleDeleteCard: (id: string) => void;
  handleGenerateCardsFromSource: () => Promise<void>;
  generateCardAudio: (card: any) => Promise<void>;
  fetchSources: () => Promise<void>;
  fetchCards: () => Promise<void>;
  handleUploadFile: () => void;
  handleUploadAudio: () => void;
  handleUploadAudioFolder: () => void;
  handlePasteImage: () => void;
  handleInsertPastedText: () => Promise<void>;
  handleChatFileDrop: (files: File[]) => Promise<void>;
  handleChatPasteImage: (e: React.ClipboardEvent) => Promise<void>;
  handleSaveInputAsSource: () => Promise<void>;
  handleGenerateCardsFromText: (text: string, providedAnalysis?: { markdown: string; html: string; kanaText: string }) => Promise<void>;
  handleRetryFailedItems: (failedItems: Array<{ text: string; type?: string }>) => Promise<void>;
  handleSaveNote: (content: string, options?: { name?: string; audioUrl?: string; timestamps?: Array<{ begin_time: number; end_time: number; text: string }> }) => Promise<void>;
  
  // Chat
  messages: any[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatLoading: boolean;
  handleSendMessage: (text?: string) => Promise<void>;
  handleClearChatHistory: () => void;
  
  sourcePanelWidth: number;
  studioPanelWidth: number;
  startResizingSource: () => void;
  startResizingStudio: () => void;
  workspaceLayoutRef?: React.RefObject<HTMLDivElement>;
}
