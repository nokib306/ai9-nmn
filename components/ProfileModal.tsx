
import React, { useState, useEffect } from 'react';
import { type BrowserProfile, ProfileStatus } from '../types';
import { generateUserAgent, generateMacAddress, parseCookies } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: BrowserProfile) => void;
  profile: BrowserProfile | null;
}

const AIGenerateButton: React.FC<{ onClick: () => void; loading: boolean; text: string }> = ({ onClick, loading, text }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="ml-2 flex items-center px-3 py-1 text-xs font-semibold text-brand-light bg-brand-secondary/50 rounded-md hover:bg-brand-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {loading ? (
            <svg className="animate-spin h-4 w-4 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        ) : (
            <SparklesIcon className="h-4 w-4 mr-1" />
        )}
        {text}
    </button>
);


const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, profile }) => {
  const [formData, setFormData] = useState<Omit<BrowserProfile, 'id' | 'status'>>({
    name: '',
    proxy: '',
    userAgent: '',
    screenResolution: '390x844',
    timezone: 'UTC',
    webRTC: 'Disabled',
    macAddress: '',
    cookies: '',
  });

  const [aiLoading, setAiLoading] = useState({
      userAgent: false,
      macAddress: false,
      cookies: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        proxy: profile.proxy,
        userAgent: profile.userAgent,
        screenResolution: profile.screenResolution,
        timezone: profile.timezone,
        webRTC: profile.webRTC,
        macAddress: profile.macAddress,
        cookies: profile.cookies,
      });
    } else {
      setFormData({
        name: '',
        proxy: '',
        userAgent: '',
        screenResolution: '390x844',
        timezone: 'UTC',
        webRTC: 'Disabled',
        macAddress: '',
        cookies: '',
      });
    }
  }, [profile, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: profile ? profile.id : Date.now().toString(),
      status: profile ? profile.status : ProfileStatus.Stopped,
    });
  };

  const handleGenerateUserAgent = async () => {
    setAiLoading(prev => ({ ...prev, userAgent: true }));
    const ua = await generateUserAgent();
    setFormData(prev => ({ ...prev, userAgent: ua }));
    setAiLoading(prev => ({ ...prev, userAgent: false }));
  };

  const handleGenerateMacAddress = async () => {
    setAiLoading(prev => ({ ...prev, macAddress: true }));
    const mac = await generateMacAddress();
    setFormData(prev => ({ ...prev, macAddress: mac }));
    setAiLoading(prev => ({ ...prev, macAddress: false }));
  };

  const handleParseCookies = async () => {
    setAiLoading(prev => ({ ...prev, cookies: true }));
    const parsed = await parseCookies(formData.cookies);
    setFormData(prev => ({ ...prev, cookies: parsed }));
    setAiLoading(prev => ({ ...prev, cookies: false }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
      <div className="bg-brand-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-brand-dark">
          <h2 className="text-xl font-bold text-white">{profile ? 'Edit Profile' : 'Create New Profile'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-dark">
             <CloseIcon/>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-brand-text-secondary mb-1">Profile Name</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text"/>
            </div>
             <div>
                <label htmlFor="proxy" className="block text-sm font-medium text-brand-text-secondary mb-1">Proxy (ip:port:user:pass)</label>
                <input type="text" id="proxy" name="proxy" value={formData.proxy} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text"/>
            </div>
            <div>
                <label htmlFor="userAgent" className="flex items-center text-sm font-medium text-brand-text-secondary mb-1">
                    User Agent (iOS/iPhone)
                    <AIGenerateButton onClick={handleGenerateUserAgent} loading={aiLoading.userAgent} text="Generate" />
                </label>
                <input type="text" id="userAgent" name="userAgent" value={formData.userAgent} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text"/>
            </div>
            <div>
                <label htmlFor="macAddress" className="flex items-center text-sm font-medium text-brand-text-secondary mb-1">
                    MAC Address
                    <AIGenerateButton onClick={handleGenerateMacAddress} loading={aiLoading.macAddress} text="Generate" />
                </label>
                <input type="text" id="macAddress" name="macAddress" value={formData.macAddress} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label htmlFor="screenResolution" className="block text-sm font-medium text-brand-text-secondary mb-1">Screen Resolution</label>
                    <select id="screenResolution" name="screenResolution" value={formData.screenResolution} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text">
                        <option>390x844</option>
                        <option>375x667</option>
                        <option>414x896</option>
                        <option>320x568</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-brand-text-secondary mb-1">Timezone</label>
                    <select id="timezone" name="timezone" value={formData.timezone} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text">
                        <option>UTC</option>
                        <option>America/New_York</option>
                        <option>America/Los_Angeles</option>
                        <option>Europe/London</option>
                        <option>Asia/Tokyo</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="webRTC" className="block text-sm font-medium text-brand-text-secondary mb-1">WebRTC</label>
                    <select id="webRTC" name="webRTC" value={formData.webRTC} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text">
                        <option>Disabled</option>
                        <option>Public</option>
                    </select>
                </div>
            </div>
            <div>
                <label htmlFor="cookies" className="flex items-center text-sm font-medium text-brand-text-secondary mb-1">
                    Cookies (Paste to Parse)
                    <AIGenerateButton onClick={handleParseCookies} loading={aiLoading.cookies} text="Parse" />
                </label>
                <textarea id="cookies" name="cookies" value={formData.cookies} onChange={handleChange} rows={4} placeholder="Paste raw cookie data here..." className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text font-mono text-xs"></textarea>
            </div>
        </form>
        <div className="p-4 bg-brand-dark/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg">Cancel</button>
          <button type="submit" onClick={handleSubmit} className="px-4 py-2 bg-brand-secondary hover:bg-blue-500 text-white font-semibold rounded-lg">{profile ? 'Save Changes' : 'Create Profile'}</button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
