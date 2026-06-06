/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { MainLayout } from "./components/MainLayout";
import { Dashboard } from "./views/Dashboard";
import { TaskManager } from "./views/TaskManager";
import { Notes } from "./views/Notes";
import { SomChat } from "./views/SomChat";
import { StudyTools } from "./views/StudyTools";
import { Timetable } from "./views/Timetable";
import { ExamTracker } from "./views/ExamTracker";
import { HabitTracker } from "./views/HabitTracker";
import { ExpenseTracker } from "./views/ExpenseTracker";
import { GradesView } from "./views/GradesView";
import { WorkspaceView } from "./views/WorkspaceView";
import { SmartFilesView } from "./views/SmartFilesView";
import { PdfEditorView } from "./views/PdfEditorView";
import { DocumentEditorView } from "./views/DocumentEditorView";
import { NoticeBoardView } from "./views/NoticeBoardView";
import { GmailView } from "./views/GmailView";
import { HackathonsView } from "./views/HackathonsView";
import { MarketplaceView } from "./views/MarketplaceView";
import { CareerHubView } from "./views/CareerHubView";
import { ApkHubView } from "./views/ApkHubView";
import { initAuth, googleSignIn } from "./googleApi";
// Placeholder for others
const Placeholder = ({ title }: { title: string }) => <div className="p-8 text-gray-500 tracking-[0.2em] uppercase text-xs font-bold">{title} • Coming Soon</div>;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = initAuth(
      (u, token) => {
        setUser(u);
        setNeedsAuth(false);
        setLoading(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#0D0D14] text-pink-500">Loading...</div>;
  }

  if (needsAuth || !user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0D0D14] text-white">
        <h1 className="text-3xl font-bold mb-4 tracking-tight">SomSphere</h1>
        <p className="text-gray-400 mb-8 max-w-sm text-center">Your all-in-one student workspace. Please sign in to continue.</p>
        <button 
          onClick={async () => {
            try {
              setSignInError(null);
              await googleSignIn();
            } catch (error: any) {
              console.error(error);
              if (error.code === 'auth/popup-blocked' || error.message?.includes('popup-blocked')) {
                setSignInError("Sign-in popup was blocked. Please open this app in a new tab (using the button in the top right corner) to sign in, or allow popups for this site.");
              } else if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user')) {
                setSignInError("Sign-in window was closed before completion. Please try again and complete the Google login form.");
              } else {
                setSignInError("Failed to sign in. Please try again.");
              }
            }
          }}
          className="px-6 py-3 bg-white text-black font-bold rounded-lg shadow-xl hover:scale-105 transition-transform"
        >
          Sign in with Google
        </button>
        {signInError && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm max-w-sm text-center">
            {signInError}
          </div>
        )}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<TaskManager />} />
          <Route path="notes" element={<Notes />} />
          <Route path="chat" element={<SomChat />} />
          <Route path="study" element={<StudyTools />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="exams" element={<ExamTracker />} />
          <Route path="grades" element={<GradesView />} />
          <Route path="habits" element={<HabitTracker />} />
          <Route path="expenses" element={<ExpenseTracker />} />
          <Route path="workspace" element={<WorkspaceView />} />
          <Route path="files" element={<SmartFilesView />} />
          <Route path="pdf-editor" element={<PdfEditorView />} />
          <Route path="document" element={<DocumentEditorView />} />
          <Route path="notices" element={<NoticeBoardView />} />
          <Route path="emails" element={<GmailView />} />
          <Route path="hackathons" element={<HackathonsView />} />
          <Route path="marketplace" element={<MarketplaceView />} />
          <Route path="career" element={<CareerHubView />} />
          <Route path="apk-hub" element={<ApkHubView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
