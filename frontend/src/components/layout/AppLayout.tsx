import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import type { Project } from '../../types';
import { getAssets, getFindings, getProjects, getStoredUser } from '../../lib/api';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const storedUser = getStoredUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Awaited<ReturnType<typeof getAssets>>>([]);
  const [findings, setFindings] = useState<Awaited<ReturnType<typeof getFindings>>>([]);
  const [loadError, setLoadError] = useState(false);

  const currentUser = storedUser!;

  useEffect(() => {
    getProjects().then(items => {
      setProjects(items);
      setSelectedProject(items[0] || null);
    }).catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    if (!selectedProject?.id) return;
    setLoadError(false);
    Promise.all([
      getAssets(selectedProject.id),
      getFindings(selectedProject.id),
    ]).then(([assetItems, findingItems]) => {
      setAssets(assetItems);
      setFindings(findingItems);
    }).catch(() => {
      setAssets([]);
      setFindings([]);
      setLoadError(true);
    });
  }, [selectedProject]);

  useEffect(() => {
    const refreshProjectData = () => {
      if (!selectedProject?.id) return;
      Promise.all([getAssets(selectedProject.id), getFindings(selectedProject.id)])
        .then(([assetItems, findingItems]) => {
          setAssets(assetItems);
          setFindings(findingItems);
        })
        .catch(() => setLoadError(true));
    };
    window.addEventListener('scan-completed', refreshProjectData);
    return () => window.removeEventListener('scan-completed', refreshProjectData);
  }, [selectedProject]);

  if (!storedUser) return <Navigate to="/login" replace />;

  if (!selectedProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-navy-950 text-sm text-slate-400">
        {loadError ? 'Unable to load project data. Please check the backend connection.' : 'Loading project data...'}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        isAdmin={currentUser.role === 'admin'}
      />
      <div className={clsx(
        'flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60',
      )}>
        <Navbar
          projects={projects}
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
          user={{ name: currentUser.name, email: currentUser.email, role: currentUser.role }}
          onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ selectedProject, assets, findings }} />
        </main>
      </div>
    </div>
  );
};
