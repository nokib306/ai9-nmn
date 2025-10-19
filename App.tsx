import React, { useState, useCallback } from 'react';
import { type BrowserProfile, ProfileStatus, ChatMessage, MessageAuthor } from './types';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import ProfileModal from './components/ProfileModal';
import { PlusIcon } from './components/icons/PlusIcon';
import BrowserView from './components/BrowserView';
import AiAgent from './components/AiAgent';
import { ChatBubbleIcon } from './components/icons/ChatBubbleIcon';

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BrowserProfile | null>(null);
  const [zIndexes, setZIndexes] = useState<{ [profileId: string]: number }>({});
  const [nextZIndex, setNextZIndex] = useState(100);
  const [isAiAgentVisible, setIsAiAgentVisible] = useState(false);
  const [runningProfileUrls, setRunningProfileUrls] = useState<{[profileId: string]: string}>({});

  const handleOpenModal = (profile: BrowserProfile | null) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProfile(null);
    setIsModalOpen(false);
  };

  const handleSaveProfile = (profile: BrowserProfile) => {
    if (editingProfile) {
      setProfiles(profiles.map(p => (p.id === profile.id ? profile : p)));
    } else {
      setProfiles([...profiles, { ...profile, id: Date.now().toString(), status: ProfileStatus.Stopped }]);
    }
    handleCloseModal();
  };

  const handleDeleteProfile = useCallback((id: string) => {
    setProfiles(prevProfiles => prevProfiles.filter(p => p.id !== id));
  }, []);

  const handleBringToFront = useCallback((id: string) => {
    if (zIndexes[id] === nextZIndex - 1) return; // Already in front
    setZIndexes(prev => ({ ...prev, [id]: nextZIndex }));
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex, zIndexes]);

  const handleLaunchProfile = useCallback((id: string) => {
    setProfiles(prevProfiles =>
      prevProfiles.map(p => {
        if (p.id === id) {
          const newStatus = p.status === ProfileStatus.Running ? ProfileStatus.Stopped : ProfileStatus.Running;
          
          if (newStatus === ProfileStatus.Running) {
            handleBringToFront(id);
          } else {
            // Clean up z-index and URL when stopping
            setZIndexes(prev => {
              const newZIndexes = { ...prev };
              delete newZIndexes[id];
              return newZIndexes;
            });
            setRunningProfileUrls(prev => {
                const newUrls = {...prev};
                delete newUrls[id];
                return newUrls;
            });
          }

          return { ...p, status: newStatus };
        }
        return p;
      })
    );
  }, [handleBringToFront]);

  // --- AI Agent Handlers ---
  const handleAiNavigate = useCallback((profileName: string, url: string): string => {
      const profile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase() && p.status === ProfileStatus.Running);
      if (!profile) {
          return `Profile "${profileName}" is not running or does not exist.`;
      }
      setRunningProfileUrls(prev => ({...prev, [profile.id]: url}));
      handleBringToFront(profile.id);
      return `Navigating profile "${profileName}" to ${url}.`;
  }, [profiles, handleBringToFront]);

  const handleAiLaunch = useCallback((profileName: string): string => {
      const profile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
      if (!profile) {
          return `Profile "${profileName}" not found.`;
      }
      if (profile.status === ProfileStatus.Running) {
          handleBringToFront(profile.id);
          return `Profile "${profileName}" is already running.`;
      }
      handleLaunchProfile(profile.id);
      return `Launching profile "${profileName}".`;
  }, [profiles, handleLaunchProfile, handleBringToFront]);

  const handleAiClose = useCallback((profileName: string): string => {
      const profile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
       if (!profile) {
          return `Profile "${profileName}" not found.`;
      }
      if (profile.status !== ProfileStatus.Running) {
          return `Profile "${profileName}" is not running.`;
      }
      handleLaunchProfile(profile.id); // This toggles the status to stopped
      return `Closing profile "${profileName}".`;
  }, [profiles, handleLaunchProfile]);

  const handleAiCreateProfile = useCallback((profileName: string): string => {
    const existingProfile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
    if (existingProfile) {
        return `A profile with the name "${profileName}" already exists.`;
    }
    const newProfile: BrowserProfile = {
        id: Date.now().toString(),
        name: profileName,
        status: ProfileStatus.Stopped,
        proxy: '',
        userAgent: '',
        screenResolution: '390x844',
        timezone: 'UTC',
        webRTC: 'Disabled',
        macAddress: '',
        cookies: '',
    };
    setProfiles(prev => [...prev, newProfile]);
    return `Successfully created a new profile named "${profileName}".`;
  }, [profiles]);


  const runningProfiles = profiles.filter(p => p.status === ProfileStatus.Running);

  return (
    <div className="min-h-screen bg-brand-background text-brand-text font-sans selection:bg-brand-secondary selection:text-white">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Browser Profiles</h1>
          <button
            onClick={() => handleOpenModal(null)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-secondary hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            <PlusIcon />
            New Profile
          </button>
        </div>
        
        {profiles.length === 0 ? (
          <div className="text-center py-20 bg-brand-surface rounded-lg">
            <p className="text-brand-text-secondary">No profiles created yet.</p>
            <p className="text-brand-text-secondary mt-2">Click "New Profile" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => handleOpenModal(profile)}
                onDelete={handleDeleteProfile}
                onLaunch={handleLaunchProfile}
              />
            ))}
          </div>
        )}
      </main>
      
      {isModalOpen && (
        <ProfileModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveProfile}
          profile={editingProfile}
        />
      )}

      {runningProfiles.map((profile, index) => (
          <BrowserView
            key={profile.id}
            profile={profile}
            onClose={() => handleLaunchProfile(profile.id)}
            initialPosition={{ x: 100 + index * 40, y: 100 + index * 40 }}
            zIndex={zIndexes[profile.id] || 100}
            onFocus={() => handleBringToFront(profile.id)}
            urlOverride={runningProfileUrls[profile.id]}
          />
      ))}
      
      <button 
        onClick={() => setIsAiAgentVisible(!isAiAgentVisible)}
        className="fixed bottom-6 right-6 bg-brand-primary h-16 w-16 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-brand-secondary transition-all duration-300 transform hover:scale-110 z-[9999]"
        aria-label="Toggle AI Agent"
      >
        <ChatBubbleIcon className="w-8 h-8"/>
      </button>

      <AiAgent 
        isVisible={isAiAgentVisible}
        onClose={() => setIsAiAgentVisible(false)}
        profiles={profiles}
        actions={{
            navigate: handleAiNavigate,
            launch: handleAiLaunch,
            close: handleAiClose,
            create: handleAiCreateProfile,
        }}
      />
    </div>
  );
};

export default App;