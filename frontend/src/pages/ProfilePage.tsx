import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Compass, User, Mail, Tag, Save, AlertTriangle, Check, BookOpen, Github, Linkedin, MessageSquare } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, error, loading } = useAuthStore();

  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [education, setEducation] = useState<string>('');
  const [github, setGithub] = useState<string>('');
  const [linkedin, setLinkedin] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setEducation(user.education || '');
      setGithub(user.github_link || '');
      setLinkedin(user.linkedin_link || '');
      setSkills(user.skills || []);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    try {
      await updateProfile({
        name,
        username,
        bio,
        education,
        github_link: github,
        linkedin_link: linkedin,
        skills
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // Error in store
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSkill.trim()) {
      e.preventDefault();
      if (!skills.includes(newSkill.trim())) {
        setSkills([...skills, newSkill.trim()]);
      }
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-[#070b13] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#070b13] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8 border-b border-slate-800/80 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold font-outfit tracking-wide text-slate-100 uppercase">Profile Settings</h1>
            <p className="text-slate-400 text-xs mt-1">Configure your personal and professional profile details</p>
          </div>
          <div className="flex items-center space-x-3 bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
              alt="Avatar"
              className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20"
            />
            <div className="text-left">
              <div className="text-xs font-bold text-slate-300">{user.name}</div>
              <div className="text-[10px] text-brand-400 uppercase font-semibold">{user.role}</div>
            </div>
          </div>
        </header>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 text-xs mb-6">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 p-3 bg-teal-950/20 border border-teal-900/50 rounded-lg text-teal-400 text-xs mb-6">
            <Check size={14} className="shrink-0" />
            <span>Profile successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Username</label>
              <div className="relative">
                <Compass className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Bio / Professional Summary</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 text-slate-500" size={16} />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Share a short summary about your background, career objective, or skills."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Education</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Degree, Field of Study, University Name"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">GitHub Profile</label>
              <div className="relative">
                <Github className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="url"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">LinkedIn Profile</label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Core Skills</label>
            <div className="relative mb-3">
              <Tag className="absolute left-3 top-3 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Type a skill and press Enter"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleAddSkill}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-200 border border-slate-700/60"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-red-400 font-bold transition ml-1"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-slate-500 italic">No skills listed. Type above to add.</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-slate-100 rounded-lg text-xs font-semibold shadow transition"
          >
            <Save size={14} />
            <span>{loading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>
      </main>
    </div>
  );
};
