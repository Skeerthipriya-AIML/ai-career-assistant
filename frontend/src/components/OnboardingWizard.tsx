import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { documentService } from '../services/document';
import { Compass, User, ShieldCheck, ArrowRight, ArrowLeft, Upload, FileText, CheckCircle } from 'lucide-react';

export const OnboardingWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user, updateProfile } = useAuthStore();

  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>(user?.name || '');
  const [careerGoal, setCareerGoal] = useState<string>('Software Engineer');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState<string>('');
  const [preferredCompanies, setPreferredCompanies] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState<string>('');
  const [resume, setResume] = useState<File | null>(null);
  const [resumeStatus, setResumeStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const careerOptions = [
    'Software Engineer',
    'AI Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'Full Stack Developer',
    'Product Manager',
    'DevOps Engineer'
  ];

  const popularSkills = ['Python', 'React', 'TypeScript', 'LangChain', 'PyTorch', 'Docker', 'SQL', 'FastAPI', 'Node.js', 'Kubernetes'];
  const popularCompanies = ['Google', 'OpenAI', 'Microsoft', 'Meta', 'Amazon', 'Apple', 'NVIDIA'];

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSkill.trim()) {
      e.preventDefault();
      if (!skills.includes(newSkill.trim())) {
        setSkills([...skills, newSkill.trim()]);
      }
      setNewSkill('');
    }
  };

  const toggleCompany = (company: string) => {
    if (preferredCompanies.includes(company)) {
      setPreferredCompanies(preferredCompanies.filter((c) => c !== company));
    } else {
      setPreferredCompanies([...preferredCompanies, company]);
    }
  };

  const handleAddCustomCompany = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newCompany.trim()) {
      e.preventDefault();
      if (!preferredCompanies.includes(newCompany.trim())) {
        setPreferredCompanies([...preferredCompanies, newCompany.trim()]);
      }
      setNewCompany('');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResume(file);
      setResumeStatus('uploading');
      try {
        await documentService.uploadDocument(file);
        setResumeStatus('success');
      } catch (err) {
        console.error('Resume upload failed', err);
        setResumeStatus('error');
      }
    }
  };

  const handleSkip = async () => {
    try {
      await updateProfile({ onboarded: true });
    } catch (err) {
      console.error('Skip profile update failed', err);
    } finally {
      if (user) {
        useAuthStore.setState({ user: { ...user, onboarded: true } });
      }
      onComplete();
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await updateProfile({
        name,
        career_goal: careerGoal,
        skills,
        preferred_companies: preferredCompanies,
        onboarded: true
      });
    } catch (err) {
      console.error('Failed to complete onboarding wizard', err);
    } finally {
      if (user) {
        useAuthStore.setState({ user: { ...user, onboarded: true } });
      }
      setSubmitting(false);
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#070b13]/95 flex items-center justify-center p-4 z-50 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#0c1324] border border-slate-800 rounded-2xl p-8 shadow-2xl relative text-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2 text-brand-500">
            <Compass size={20} className="animate-spin-slow" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-brand-500">Career Onboarding</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-slate-200 transition font-semibold underline underline-offset-2"
            >
              Skip for now
            </button>
            <div className="flex space-x-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition ${
                    step >= i ? 'bg-brand-500' : 'bg-slate-800'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4 text-left animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-100 font-outfit">Welcome to AI Career Assistant!</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Let's configure your AI career assistant. First, confirm your display name.
            </p>
            <div className="space-y-2 mt-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-left animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-100 font-outfit">What is your career goal?</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              We personalize your chats, interview coach questions, and resume matching metrics to fit this target role.
            </p>
            <div className="space-y-2 mt-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Target Role</label>
              <select
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              >
                {careerOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-left animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-100 font-outfit">Add Core Skills & Targets</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Select or type skills and target corporations to customize interview simulation loops.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Select Core Skills</label>
                <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                  {popularSkills.map((sk) => {
                    const active = skills.includes(sk);
                    return (
                      <button
                        key={sk}
                        onClick={() => toggleSkill(sk)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition ${
                          active
                            ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {sk}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Or press Enter to add custom skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleAddCustomSkill}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Target Corporations</label>
                <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                  {popularCompanies.map((comp) => {
                    const active = preferredCompanies.includes(comp);
                    return (
                      <button
                        key={comp}
                        onClick={() => toggleCompany(comp)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition ${
                          active
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {comp}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Or press Enter to add custom target company"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyDown={handleAddCustomCompany}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-left animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-100 font-outfit">Upload your Resume</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              (Optional) Upload your PDF/Docx resume. Our ATS parser will check keywords and customize questions.
            </p>

            <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-900/20 relative">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload size={32} className="text-slate-500 mx-auto mb-3 animate-pulse" />
              {resume ? (
                <div className="flex items-center justify-center space-x-2 text-slate-300 text-xs font-semibold">
                  <FileText size={16} className="text-brand-500" />
                  <span>{resume.name}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-450">
                  Drag and drop or click to upload PDF/Docx
                </div>
              )}
              
              {resumeStatus === 'uploading' && (
                <span className="text-[10px] text-brand-400 mt-2 block font-semibold animate-pulse">Parsing files...</span>
              )}
              {resumeStatus === 'success' && (
                <span className="text-[10px] text-teal-400 mt-2 block font-semibold flex items-center justify-center space-x-1">
                  <CheckCircle size={12} />
                  <span>Document parsed successfully!</span>
                </span>
              )}
              {resumeStatus === 'error' && (
                <span className="text-[10px] text-red-450 mt-2 block font-semibold">Parser connection error. Proceeding.</span>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-8 border-t border-slate-800/60 pt-5">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center space-x-1.5 text-xs text-slate-450 hover:text-slate-200 transition font-semibold"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !name.trim()}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-850 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-semibold shadow transition disabled:opacity-40"
            >
              <span>Continue</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="flex items-center space-x-1.5 px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
            >
              <span>{submitting ? 'Finishing...' : 'Complete Profile'}</span>
              <ShieldCheck size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
