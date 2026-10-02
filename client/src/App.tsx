import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { LiveTickerTelemetry } from './components/ui/LiveTickerTelemetry.js';
import { CommandPalette } from './components/ui/CommandPalette.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Cases } from './pages/Cases.js';
import { CaseDetail } from './pages/CaseDetail.js';
import { Documents } from './pages/Documents.js';
import { DocumentDetail } from './pages/DocumentDetail.js';
import { Evidence } from './pages/Evidence.js';
import { SemanticSearch } from './pages/SemanticSearch.js';
import { Investigation } from './pages/Investigation.js';
import { Reports } from './pages/Reports.js';
import { AuditExplorer } from './pages/AuditExplorer.js';
import { IntegrityCenter } from './pages/IntegrityCenter.js';
import { Settings } from './pages/Settings.js';
import { SharedResourceView } from './pages/SharedResourceView.js';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Check hash for share link
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/share/')) {
        const token = hash.replace('#/share/', '');
        setShareToken(token);
      } else {
        setShareToken(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Global Ctrl+K (Command Menu) & Ctrl+[ / Ctrl+B (Sidebar Toggle) listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '[' || e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex flex-col items-center justify-center text-[#172033] text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#12355B] border-t-transparent mb-3" />
        <span className="font-semibold text-[#172033]">Initializing NYAYASETU AI secure evidence workstation...</span>
        <span className="text-[10px] text-[#64748B] font-mono mt-1">Verifying Section 65B anchor keys & sovereign cryptographic tokens</span>
      </div>
    );
  }

  // Handle Public Share Link View
  if (shareToken) {
    return (
      <SharedResourceView
        token={shareToken}
        onExit={() => {
          window.location.hash = '';
          setShareToken(null);
        }}
      />
    );
  }

  // Authentication Guard
  if (!user) {
    return <Login />;
  }

  const navigateTo = (tab: string, extraId?: string) => {
    setCurrentTab(tab);
    if (tab === 'cases') {
      setSelectedCaseId(extraId || null);
    } else if (tab === 'documents') {
      setSelectedDocId(extraId || null);
    } else if (tab === 'evidence') {
      setSelectedEvidenceId(extraId || null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#172033] flex flex-col selection:bg-[#12355B] selection:text-white font-sans">
      {/* Top Telemetry Ticker Bar */}
      <LiveTickerTelemetry />

      {/* Main Masthead Navbar */}
      <Navbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onNavigateTab={navigateTo}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(prev => !prev)}
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setSelectedCaseId(null);
            setSelectedDocId(null);
            setSelectedEvidenceId(null);
            setCurrentTab(tab);
          }}
        />

        <main className="flex-1 overflow-y-auto bg-transparent pb-16 transition-all duration-300">
          {/* MAIN GROUP */}
          {currentTab === 'dashboard' && (
            <Dashboard onNavigate={navigateTo} />
          )}

          {currentTab === 'cases' && (
            selectedCaseId ? (
              <CaseDetail
                caseId={selectedCaseId}
                onBack={() => setSelectedCaseId(null)}
                onSelectDocument={(docId) => {
                  setSelectedDocId(docId);
                  setCurrentTab('documents');
                }}
                onSelectEvidence={(evId) => {
                  setSelectedEvidenceId(evId);
                  setCurrentTab('evidence');
                }}
                onUploadDocToCase={(caseId) => {
                  setSelectedDocId(null);
                  setCurrentTab('documents');
                }}
              />
            ) : (
              <Cases onSelectCase={(id) => setSelectedCaseId(id)} />
            )
          )}

          {currentTab === 'documents' && (
            selectedDocId ? (
              <DocumentDetail
                documentId={selectedDocId}
                onBack={() => setSelectedDocId(null)}
                onNavigateToCase={(caseId) => {
                  setSelectedCaseId(caseId);
                  setCurrentTab('cases');
                }}
              />
            ) : (
              <Documents
                onSelectDocument={(id) => setSelectedDocId(id)}
                preselectedCaseId={selectedCaseId}
              />
            )
          )}

          {currentTab === 'evidence' && (
            <Evidence
              onSelectCase={(caseId) => {
                setSelectedCaseId(caseId);
                setCurrentTab('cases');
              }}
              preselectedEvidenceId={selectedEvidenceId}
            />
          )}

          {currentTab === 'search' && (
            <SemanticSearch
              onNavigateToCase={(caseId) => {
                setSelectedCaseId(caseId);
                setCurrentTab('cases');
              }}
              onNavigateToDoc={(docId) => {
                setSelectedDocId(docId);
                setCurrentTab('documents');
              }}
              onNavigateToEvidence={(evId) => {
                setSelectedEvidenceId(evId);
                setCurrentTab('evidence');
              }}
            />
          )}

          {/* INTELLIGENCE GROUP */}
          {(currentTab === 'investigation' || currentTab === 'copilot' || currentTab === 'intelligence' || currentTab === 'persons') && (
            <Investigation
              onNavigateToCase={(caseId) => {
                setSelectedCaseId(caseId);
                setCurrentTab('cases');
              }}
              onNavigateToDoc={(docId) => {
                setSelectedDocId(docId);
                setCurrentTab('documents');
              }}
            />
          )}

          {currentTab === 'reports' && (
            <Reports />
          )}

          {/* SYSTEM GROUP */}
          {currentTab === 'integrity' && (
            <IntegrityCenter />
          )}

          {currentTab === 'audit' && (
            <AuditExplorer
              onNavigateToCase={(caseId) => {
                setSelectedCaseId(caseId);
                setCurrentTab('cases');
              }}
              onNavigateToDoc={(docId) => {
                setSelectedDocId(docId);
                setCurrentTab('documents');
              }}
            />
          )}

          {(currentTab === 'settings' || currentTab === 'system' || currentTab === 'assets' || currentTab === 'sharing') && (
            <Settings onNavigateTab={(tab, extraId) => navigateTo(tab, extraId)} />
          )}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={navigateTo}
      />
    </div>
  );
};
