import React from 'react';
import { type BrowserProfile, ProfileStatus, ProxyType } from '../types';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { ExtensionsIcon } from './icons/ExtensionsIcon';

interface ProfileCardProps {
  profile: BrowserProfile;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onLaunch: (id: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onEdit, onDelete, onLaunch }) => {
  const getStatusClasses = () => {
    switch (profile.status) {
      case ProfileStatus.Running:
        return 'bg-green-500 text-green-100';
      case ProfileStatus.Stopped:
        return 'bg-gray-500 text-gray-100';
      case ProfileStatus.Error:
        return 'bg-red-500 text-red-100';
      default:
        return 'bg-gray-500 text-gray-100';
    }
  };

  const getProxyDisplay = () => {
    if (!profile.proxy || profile.proxy.type === ProxyType.None) {
        return 'None';
    }
    return `${profile.proxy.type}: ${profile.proxy.ip}:${profile.proxy.port}`;
  };

  return (
    <div className="bg-brand-surface rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col border border-brand-dark/30">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-white truncate pr-2">{profile.name}</h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses()}`}>
            {profile.status}
          </span>
        </div>
        <p className="text-sm text-brand-text-secondary mt-1 truncate">{profile.deviceName || 'No device name'}</p>
        <div className="mt-4 space-y-2 text-sm text-brand-text-secondary">
           <p className="flex items-center">
             <span className="font-semibold w-28">Fingerprint ID:</span>
             <span className="truncate font-mono text-xs">{profile.id.substring(0, 8)}...</span>
          </p>
          <p className="flex items-center">
            <span className="font-semibold w-28">Proxy:</span>
            <span className="truncate">{getProxyDisplay()}</span>
          </p>
          <p className="flex items-center">
            <span className="font-semibold w-28">User Agent:</span>
            <span className="truncate">{profile.userAgent ? 'Custom' : 'Default'}</span>
          </p>
          <p className="flex items-center">
            <span className="font-semibold w-28 flex items-center gap-1"><ExtensionsIcon className="w-4 h-4"/> Extensions:</span>
            <span>{profile.extensionIds?.length || 0}</span>
          </p>
        </div>
      </div>
      <div className="p-3 bg-gray-800/50 flex justify-end items-center gap-2">
        <button onClick={onEdit} className="p-2 rounded-full hover:bg-brand-secondary/30 text-brand-light transition-colors">
          <EditIcon />
        </button>
        <button onClick={() => onDelete(profile.id)} className="p-2 rounded-full hover:bg-red-500/30 text-red-400 transition-colors">
          <TrashIcon />
        </button>
        <button
          onClick={() => onLaunch(profile.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all ${
            profile.status === ProfileStatus.Running ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {profile.status === ProfileStatus.Running ? <StopIcon /> : <PlayIcon />}
          {profile.status === ProfileStatus.Running ? 'Stop' : 'Launch'}
        </button>
      </div>
    </div>
  );
};

export default ProfileCard;