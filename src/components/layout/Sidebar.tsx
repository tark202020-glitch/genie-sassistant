'use client';

import { BookOpen, Bot, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SharedDocsTab } from '@/components/sidebar/SharedDocsTab';
import { AssistantsTab } from '@/components/sidebar/AssistantsTab';
import { useDocuments } from '@/hooks/use-documents';
import { useAssistants } from '@/hooks/use-assistants';
import type { SidebarTab } from '@/types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  documents: ReturnType<typeof useDocuments>;
  assistantsHook: ReturnType<typeof useAssistants>;
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;
}

export function Sidebar({
  open,
  onClose,
  documents,
  assistantsHook,
  sidebarTab,
  setSidebarTab,
}: SidebarProps) {
  return (
    <aside
      className={`${
        open ? 'w-80' : 'w-0'
      } transition-all duration-300 overflow-hidden border-r border-border flex-shrink-0`}
    >
      <div className="w-80 h-full flex flex-col bg-muted/20">
        <Tabs
          value={sidebarTab}
          onValueChange={(v) => setSidebarTab(v as SidebarTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex items-center border-b border-border">
            <TabsList className="flex-1 h-auto bg-transparent rounded-none p-0">
              <TabsTrigger
                value="shared"
                className="flex-1 py-3 rounded-none data-[state=active]:bg-background/50 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                공유 학습자료
              </TabsTrigger>
              <TabsTrigger
                value="assistants"
                className="flex-1 py-3 rounded-none data-[state=active]:bg-background/50 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <Bot className="w-3.5 h-3.5 mr-1.5" />
                보조작가
                {assistantsHook.assistants.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] bg-purple-500/20 text-purple-400 border-0">
                    {assistantsHook.assistants.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <button
              onClick={onClose}
              className="px-2 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <TabsContent value="shared" className="flex-1 flex flex-col overflow-hidden mt-0">
            <SharedDocsTab
              documents={documents.documents}
              loadingDocs={documents.loadingDocs}
              files={documents.files}
              setFiles={documents.setFiles}
              uploadStep={documents.uploadStep}
              uploadMessage={documents.uploadMessage}
              deletingDocId={documents.deletingDocId}
              fileInputRef={documents.fileInputRef}
              onUpload={documents.handleFileUpload}
              onDelete={documents.handleDeleteDocument}
              onRefresh={documents.fetchDocuments}
              onClearUpload={documents.clearUploadState}
            />
          </TabsContent>

          <TabsContent value="assistants" className="flex-1 flex flex-col overflow-hidden mt-0">
            <AssistantsTab
              assistants={assistantsHook.assistants}
              loadingAssistants={assistantsHook.loadingAssistants}
              selectedAssistant={assistantsHook.selectedAssistant}
              setSelectedAssistant={assistantsHook.setSelectedAssistant}
              activeAssistantId={assistantsHook.activeAssistantId}
              setActiveAssistantId={assistantsHook.setActiveAssistantId}
              showCreateForm={assistantsHook.showCreateForm}
              setShowCreateForm={assistantsHook.setShowCreateForm}
              newName={assistantsHook.newName}
              setNewName={assistantsHook.setNewName}
              newSpecialty={assistantsHook.newSpecialty}
              setNewSpecialty={assistantsHook.setNewSpecialty}
              newPersona={assistantsHook.newPersona}
              setNewPersona={assistantsHook.setNewPersona}
              creating={assistantsHook.creating}
              onCreate={assistantsHook.handleCreateAssistant}
              onDelete={assistantsHook.handleDeleteAssistant}
              onRefresh={assistantsHook.fetchAssistants}
              onSelectAssistant={(a) => {
                assistantsHook.setSelectedAssistant(a);
                assistantsHook.fetchAssistantDocs(a.id);
              }}
              assistantDocs={assistantsHook.assistantDocs}
              loadingAssistantDocs={assistantsHook.loadingAssistantDocs}
              assistantFiles={assistantsHook.assistantFiles}
              setAssistantFiles={assistantsHook.setAssistantFiles}
              assistantDocType={assistantsHook.assistantDocType}
              setAssistantDocType={assistantsHook.setAssistantDocType}
              assistantUploadStep={assistantsHook.assistantUploadStep}
              assistantUploadMessage={assistantsHook.assistantUploadMessage}
              assistantFileInputRef={assistantsHook.assistantFileInputRef}
              onAssistantUpload={assistantsHook.handleAssistantFileUpload}
              onDeleteAssistantDoc={assistantsHook.handleDeleteAssistantDoc}
              onClearAssistantUpload={assistantsHook.clearAssistantUploadState}
              setAssistantDocs={assistantsHook.setAssistantDocs}
            />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
