import { useState, useRef, useEffect } from 'react';
import ToolFeedback from '../ui/ToolFeedback';
import { sanitizeFilename } from '../../lib/security';
import { announce, haptic } from '../../lib/accessibility';

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  skills: string;
}

const defaultData: ResumeData = {
  name: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  experience: [{ title: '', company: '', dates: '', description: '' }],
  education: [{ degree: '', school: '', year: '' }],
  skills: '',
};

type Template = 'modern' | 'classic' | 'minimal';

export default function ResumeBuilder() {
    const [data, setData] = useState<ResumeData>(defaultData);
  const [template, setTemplate] = useState<Template>('modern');
  const [generated, setGenerated] = useState(false);

  // Roving tabindex state for experience and education
  const [activeExperienceIndex, setActiveExperienceIndex] = useState(0);
  const [activeEducationIndex, setActiveEducationIndex] = useState(0);
  const experienceListRef = useRef<HTMLDivElement>(null);
  const educationListRef = useRef<HTMLDivElement>(null);

  const updateField = (field: keyof ResumeData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const addExperience = () => {
    setData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', dates: '', description: '' }]
    }));
    announce('Experience entry added');
    haptic.tap();
  };

  const updateExperience = (index: number, field: string, value: string) => {
    const updated = [...data.experience];
    updated[index] = { ...updated[index], [field]: value };
    setData(prev => ({ ...prev, experience: updated }));
  };

  const removeExperience = (index: number) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
    // Adjust active index if needed
    if (activeExperienceIndex >= data.experience.length - 1 && data.experience.length > 1) {
      setActiveExperienceIndex(data.experience.length - 2);
    }
    announce('Experience entry removed');
    haptic.tap();
  };

  const moveExperience = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.experience.length) return;
    const updated = [...data.experience];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setData(prev => ({ ...prev, experience: updated }));
    setActiveExperienceIndex(newIndex);
    announce(`Moved to position ${newIndex + 1}`);
    haptic.tap();
  };

  // Keyboard navigation for experience list (roving tabindex pattern)
  const handleExperienceKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < data.experience.length - 1) {
          setActiveExperienceIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setActiveExperienceIndex(index - 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveExperienceIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveExperienceIndex(data.experience.length - 1);
        break;
      case 'Delete':
      case 'Backspace':
        // Only delete if not focused on an input/textarea
        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (data.experience.length > 1) {
            removeExperience(index);
          }
        }
        break;
    }
  };

  const addEducation = () => {
    setData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', school: '', year: '' }]
    }));
    announce('Education entry added');
    haptic.tap();
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...data.education];
    updated[index] = { ...updated[index], [field]: value };
    setData(prev => ({ ...prev, education: updated }));
  };

  const removeEducation = (index: number) => {
    setData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
    // Adjust active index if needed
    if (activeEducationIndex >= data.education.length - 1 && data.education.length > 1) {
      setActiveEducationIndex(data.education.length - 2);
    }
    announce('Education entry removed');
    haptic.tap();
  };

  const moveEducation = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.education.length) return;
    const updated = [...data.education];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setData(prev => ({ ...prev, education: updated }));
    setActiveEducationIndex(newIndex);
    announce(`Moved to position ${newIndex + 1}`);
    haptic.tap();
  };

  // Keyboard navigation for education list (roving tabindex pattern)
  const handleEducationKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < data.education.length - 1) {
          setActiveEducationIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setActiveEducationIndex(index - 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveEducationIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveEducationIndex(data.education.length - 1);
        break;
      case 'Delete':
      case 'Backspace':
        // Only delete if not focused on an input/textarea
        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (data.education.length > 1) {
            removeEducation(index);
          }
        }
        break;
    }
  };

  // Focus active items when index changes
  useEffect(() => {
    if (experienceListRef.current && data.experience.length > 0) {
      const activeItem = experienceListRef.current.querySelector(`[data-index="${activeExperienceIndex}"]`) as HTMLElement;
      activeItem?.focus();
    }
  }, [activeExperienceIndex, data.experience.length]);

  useEffect(() => {
    if (educationListRef.current && data.education.length > 0) {
      const activeItem = educationListRef.current.querySelector(`[data-index="${activeEducationIndex}"]`) as HTMLElement;
      activeItem?.focus();
    }
  }, [activeEducationIndex, data.education.length]);

  const generatePDF = async () => {
    
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const colors = {
      modern: { primary: [41, 128, 185], secondary: [52, 73, 94] },
      classic: { primary: [0, 0, 0], secondary: [80, 80, 80] },
      minimal: { primary: [100, 100, 100], secondary: [150, 150, 150] },
    };

    const color = colors[template];

    // Header
    doc.setFontSize(24);
    doc.setTextColor(...color.primary as [number, number, number]);
    doc.text(data.name || 'Your Name', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(...color.secondary as [number, number, number]);
    const contactInfo = [data.email, data.phone, data.location].filter(Boolean).join(' | ');
    doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Summary
    if (data.summary) {
      doc.setFontSize(12);
      doc.setTextColor(...color.primary as [number, number, number]);
      doc.text('SUMMARY', 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const summaryLines = doc.splitTextToSize(data.summary, pageWidth - 40);
      doc.text(summaryLines, 20, y);
      y += summaryLines.length * 5 + 10;
    }

    // Experience
    if (data.experience.some(e => e.title || e.company)) {
      doc.setFontSize(12);
      doc.setTextColor(...color.primary as [number, number, number]);
      doc.text('EXPERIENCE', 20, y);
      y += 7;

      data.experience.forEach(exp => {
        if (!exp.title && !exp.company) return;

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(exp.title || 'Position', 20, y);

        doc.setFontSize(10);
        doc.setTextColor(...color.secondary as [number, number, number]);
        if (exp.dates) {
          doc.text(exp.dates, pageWidth - 20, y, { align: 'right' });
        }
        y += 5;

        doc.setTextColor(100, 100, 100);
        doc.text(exp.company || '', 20, y);
        y += 5;

        if (exp.description) {
          doc.setTextColor(0, 0, 0);
          const descLines = doc.splitTextToSize(exp.description, pageWidth - 40);
          doc.text(descLines, 20, y);
          y += descLines.length * 5;
        }
        y += 5;
      });
      y += 5;
    }

    // Education
    if (data.education.some(e => e.degree || e.school)) {
      doc.setFontSize(12);
      doc.setTextColor(...color.primary as [number, number, number]);
      doc.text('EDUCATION', 20, y);
      y += 7;

      data.education.forEach(edu => {
        if (!edu.degree && !edu.school) return;

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(edu.degree || 'Degree', 20, y);

        doc.setFontSize(10);
        doc.setTextColor(...color.secondary as [number, number, number]);
        if (edu.year) {
          doc.text(edu.year, pageWidth - 20, y, { align: 'right' });
        }
        y += 5;

        doc.setTextColor(100, 100, 100);
        doc.text(edu.school || '', 20, y);
        y += 8;
      });
      y += 5;
    }

    // Skills
    if (data.skills) {
      doc.setFontSize(12);
      doc.setTextColor(...color.primary as [number, number, number]);
      doc.text('SKILLS', 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const skillsLines = doc.splitTextToSize(data.skills, pageWidth - 40);
      doc.text(skillsLines, 20, y);
    }

    const safeName = sanitizeFilename(data.name || 'resume');
    doc.save(`${safeName}.pdf`);
    setGenerated(true);
      };

  return (
    <div className="space-y-6">
                  {/* Template Selection */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
        <label className="block text-sm text-[var(--text-muted)] mb-2">Template Style</label>
        <div className="grid grid-cols-3 gap-2">
          {(['modern', 'classic', 'minimal'] as Template[]).map((t) => (
            <button
              key={t}
              onClick={() => setTemplate(t)}
              className={`py-2 px-3 rounded-lg border text-sm capitalize transition-all ${
                template === t
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text)]">Personal Information</h3>
        <input
          type="text"
          placeholder="Full Name"
          value={data.name}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)]"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="email"
            placeholder="Email"
            value={data.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)]"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={data.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)]"
          />
        </div>
        <input
          type="text"
          placeholder="Location (City, State)"
          value={data.location}
          onChange={(e) => updateField('location', e.target.value)}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)]"
        />
        <textarea
          placeholder="Professional Summary"
          value={data.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          rows={3}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] resize-none"
        />
      </div>

      {/* Experience - Roving tabindex for keyboard navigation */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-[var(--text)]">Experience</h3>
          <button
            onClick={addExperience}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            + Add
          </button>
        </div>
        <div
          ref={experienceListRef}
          role="list"
          aria-label={`${data.experience.length} experience entries. Use arrow keys to navigate.`}
        >
        {data.experience.map((exp, i) => (
          <div
            key={i}
            role="listitem"
            tabIndex={i === activeExperienceIndex ? 0 : -1}
            data-index={i}
            onKeyDown={(e) => handleExperienceKeyDown(e, i)}
            aria-label={`Experience ${i + 1}: ${exp.title || 'Untitled'} at ${exp.company || 'Company'}`}
            className="border border-[var(--border)] rounded-lg p-3 space-y-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => moveExperience(i, 'up')}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveExperience(i, 'down')}
                  disabled={i === data.experience.length - 1}
                  aria-label="Move down"
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Job Title"
                value={exp.title}
                onChange={(e) => updateExperience(i, 'title', e.target.value)}
                className="flex-1 mx-2 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] text-sm"
              />
              {data.experience.length > 1 && (
                <button
                  onClick={() => removeExperience(i)}
                  aria-label={`Remove experience ${i + 1}`}
                  className="ml-2 text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Company"
                value={exp.company}
                onChange={(e) => updateExperience(i, 'company', e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] text-sm"
              />
              <input
                type="text"
                placeholder="Dates (e.g., 2020 - Present)"
                value={exp.dates}
                onChange={(e) => updateExperience(i, 'dates', e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] text-sm"
              />
            </div>
            <textarea
              placeholder="Description of responsibilities and achievements"
              value={exp.description}
              onChange={(e) => updateExperience(i, 'description', e.target.value)}
              rows={2}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] text-sm resize-none"
            />
          </div>
        ))}
        </div>
      </div>

      {/* Education - Roving tabindex for keyboard navigation */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-[var(--text)]">Education</h3>
          <button
            onClick={addEducation}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            + Add
          </button>
        </div>
        <div
          ref={educationListRef}
          role="list"
          aria-label={`${data.education.length} education entries. Use arrow keys to navigate.`}
        >
        {data.education.map((edu, i) => (
          <div
            key={i}
            role="listitem"
            tabIndex={i === activeEducationIndex ? 0 : -1}
            data-index={i}
            onKeyDown={(e) => handleEducationKeyDown(e, i)}
            aria-label={`Education ${i + 1}: ${edu.degree || 'Degree'} at ${edu.school || 'School'}`}
            className="border border-[var(--border)] rounded-lg p-3 space-y-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => moveEducation(i, 'up')}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveEducation(i, 'down')}
                  disabled={i === data.education.length - 1}
                  aria-label="Move down"
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Degree"
                value={edu.degree}
                onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                className="flex-1 mx-2 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] text-sm"
              />
              {data.education.length > 1 && (
                <button
                  onClick={() => removeEducation(i)}
                  aria-label={`Remove education ${i + 1}`}
                  className="ml-2 text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="School/University"
                value={edu.school}
                onChange={(e) => updateEducation(i, 'school', e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] text-sm"
              />
              <input
                type="text"
                placeholder="Year"
                value={edu.year}
                onChange={(e) => updateEducation(i, 'year', e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] text-sm"
              />
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Skills */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text)]">Skills</h3>
        <textarea
          placeholder="List your skills (e.g., JavaScript, React, Project Management, Communication)"
          value={data.skills}
          onChange={(e) => updateField('skills', e.target.value)}
          rows={2}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text)] resize-none"
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePDF}
        className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90"
      >
        Generate Resume PDF
      </button>

      {/* Feedback after generation */}
      {generated && (
        <div className="pt-2 border-t border-[var(--border)]">
          <ToolFeedback toolId="resume-builder" />
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)]">
        <p>• Creates professional PDF resume instantly</p>
        <p>• All data stays in your browser</p>
      </div>
    </div>
  );
}
