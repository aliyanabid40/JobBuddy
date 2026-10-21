"use client";

import * as React from "react";
import { FullProfileData, ProfileInfo, SkillItem, ExperienceItem, EducationItem, ProjectItem, CertificationItem } from "@/features/resume/schema";
import {
  getFullProfile,
  updatePersonalInfo,
  saveSkills,
  saveExperiences,
  saveEducations,
  saveProjects,
  saveCertifications,
} from "@/features/resume/actions";
import { ProfileCompletenessCard } from "./completeness-card";
import { calculateDetailedCompleteness } from "@/features/resume/completeness";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  DocumentCodeIcon,
  Briefcase01Icon,
  GraduationCapIcon,
  CodeCircleIcon,
  Award01Icon,
  PlusSignIcon,
  Delete02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  FloppyDiskIcon,
  Certificate01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";

interface ProfileEditorProps {
  initialData: FullProfileData;
}

export function ProfileEditor({ initialData }: ProfileEditorProps) {
  const [profile, setProfile] = React.useState<ProfileInfo>(initialData.profile);
  const [skills, setSkills] = React.useState<SkillItem[]>(initialData.skills);
  const [experiences, setExperiences] = React.useState<ExperienceItem[]>(initialData.experiences);
  const [educations, setEducations] = React.useState<EducationItem[]>(initialData.educations);
  const [projects, setProjects] = React.useState<ProjectItem[]>(initialData.projects);
  const [certifications, setCertifications] = React.useState<CertificationItem[]>(initialData.certifications);

  // Sync state whenever initialData changes from Server Component
  React.useEffect(() => {
    setProfile(initialData.profile);
    setSkills(initialData.skills);
    setExperiences(initialData.experiences);
    setEducations(initialData.educations);
    setProjects(initialData.projects);
    setCertifications(initialData.certifications);
  }, [initialData]);

  // Syncing state
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Client-side auto-fetch on mount: ensures that if Next.js pre-fetched before
  // resume parse finished, the live hydrated data from DB is applied immediately!
  const syncWithDatabase = React.useCallback(async (showToast = false) => {
    try {
      setIsSyncing(true);
      const res = await getFullProfile();
      if (res.ok && res.data) {
        setProfile(res.data.profile);
        setSkills(res.data.skills);
        setExperiences(res.data.experiences);
        setEducations(res.data.educations);
        setProjects(res.data.projects);
        setCertifications(res.data.certifications);
        if (showToast) {
          showFeedback("Profile synced with latest database records!");
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  React.useEffect(() => {
    syncWithDatabase(false);
  }, [syncWithDatabase]);

  // Controlled active tab
  const [activeTab, setActiveTab] = React.useState<string>("personal");

  // New Skill Input state
  const [newSkillName, setNewSkillName] = React.useState("");
  const [newSkillCategory, setNewSkillCategory] = React.useState("Languages");

  // Save states
  const [savingSection, setSavingSection] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Live dynamic detailed completeness scores
  const detailedCompleteness = calculateDetailedCompleteness({
    profile,
    skills,
    experiences,
    educations,
    projects,
    certifications,
  });

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // --- Handlers: Personal Info ---
  const handleSavePersonalInfo = async () => {
    setSavingSection("personal");
    const res = await updatePersonalInfo(profile);
    setSavingSection(null);
    if (res.ok) {
      showFeedback("Personal information updated successfully!");
    } else {
      showFeedback(res.error || "Failed to save profile", "error");
    }
  };

  // --- Handlers: Skills ---
  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const item: SkillItem = {
      name: newSkillName.trim(),
      category: newSkillCategory.trim() || "General",
    };
    setSkills((prev) => [...prev, item]);
    setNewSkillName("");
  };

  const handleRemoveSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSkills = async () => {
    setSavingSection("skills");
    const res = await saveSkills(skills);
    setSavingSection(null);
    if (res.ok) {
      showFeedback("Skills list saved successfully!");
    } else {
      showFeedback(res.error || "Failed to save skills", "error");
    }
  };

  // --- Handlers: Experiences ---
  const handleAddExperience = () => {
    const item: ExperienceItem = {
      company: "",
      title: "",
      location: "",
      start_date: "",
      end_date: "Present",
      is_current: true,
      description: "",
      responsibilities: [""],
    };
    setExperiences((prev) => [item, ...prev]);
  };

  const handleUpdateExperience = <K extends keyof ExperienceItem>(
    index: number,
    field: K,
    value: ExperienceItem[K]
  ) => {
    setExperiences((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddResponsibility = (expIndex: number) => {
    setExperiences((prev) => {
      const next = [...prev];
      const resps = [...(next[expIndex].responsibilities || []), ""];
      next[expIndex] = { ...next[expIndex], responsibilities: resps };
      return next;
    });
  };

  const handleUpdateResponsibility = (expIndex: number, respIndex: number, text: string) => {
    setExperiences((prev) => {
      const next = [...prev];
      const resps = [...(next[expIndex].responsibilities || [])];
      resps[respIndex] = text;
      next[expIndex] = { ...next[expIndex], responsibilities: resps };
      return next;
    });
  };

  const handleRemoveResponsibility = (expIndex: number, respIndex: number) => {
    setExperiences((prev) => {
      const next = [...prev];
      const resps = next[expIndex].responsibilities.filter((_, i) => i !== respIndex);
      next[expIndex] = { ...next[expIndex], responsibilities: resps };
      return next;
    });
  };

  const handleSaveExperiences = async () => {
    setSavingSection("experiences");
    const res = await saveExperiences(experiences);
    setSavingSection(null);
    if (res.ok) {
      showFeedback("Work experience entries saved!");
    } else {
      showFeedback(res.error || "Failed to save experiences", "error");
    }
  };

  // --- Handlers: Education ---
  const handleAddEducation = () => {
    const item: EducationItem = {
      institution: "",
      degree: "",
      field_of_study: "",
      start_date: "",
      end_date: "",
      gpa: "",
    };
    setEducations((prev) => [item, ...prev]);
  };

  const handleUpdateEducation = <K extends keyof EducationItem>(
    index: number,
    field: K,
    value: EducationItem[K]
  ) => {
    setEducations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveEducation = (index: number) => {
    setEducations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEducation = async () => {
    setSavingSection("education");
    const res = await saveEducations(educations);
    setSavingSection(null);
    if (res.ok) {
      showFeedback("Education details saved!");
    } else {
      showFeedback(res.error || "Failed to save education", "error");
    }
  };

  // --- Handlers: Projects ---
  const handleAddProject = () => {
    const item: ProjectItem = {
      title: "",
      description: "",
      url: "",
      github_url: "",
      technologies: [],
    };
    setProjects((prev) => [item, ...prev]);
  };

  const handleUpdateProject = <K extends keyof ProjectItem>(
    index: number,
    field: K,
    value: ProjectItem[K]
  ) => {
    setProjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProjects = async () => {
    setSavingSection("projects");
    const res = await saveProjects(projects);
    setSavingSection(null);
    if (res.ok) {
      showFeedback("Projects updated successfully!");
    } else {
      showFeedback(res.error || "Failed to save projects", "error");
    }
  };

  // --- Handlers: Certifications ---
  const handleAddCertification = () => {
    const item: CertificationItem = {
      name: "",
      issuer: "",
      issue_date: "",
      expiration_date: "",
      credential_url: "",
    };
    setCertifications((prev) => [item, ...prev]);
  };

  const handleUpdateCertification = <K extends keyof CertificationItem>(
    index: number,
    field: K,
    value: CertificationItem[K]
  ) => {
    setCertifications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveCertification = (index: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCertifications = async () => {
    setSavingSection("certifications");
    const res = await saveCertifications(certifications);
    setSavingSection(null);
    if (res.ok) {
      showFeedback("Certifications saved!");
    } else {
      showFeedback(res.error || "Failed to save certifications", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Profile
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-xs">
            Review and edit the information extracted from your resume.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => syncWithDatabase(true)}
          disabled={isSyncing}
          className="border-zinc-300 dark:border-zinc-800 text-xs font-medium gap-2 self-start sm:self-auto"
        >
          <HugeiconsIcon
            icon={isSyncing ? Loading03Icon : RefreshIcon}
            size={14}
            className={isSyncing ? "animate-spin text-[#ACF417]" : ""}
          />
          <span>{isSyncing ? "Syncing..." : "Sync from Database"}</span>
        </Button>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 transition-all shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
          }`}
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
          <span className="font-semibold">{feedback.text}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Reusable Profile Completeness Card */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <ProfileCompletenessCard
            details={detailedCompleteness}
            activeTab={activeTab}
            onSelectTab={(tabId) => setActiveTab(tabId)}
          />
        </div>

        {/* Right Column: Tabbed Category Content */}
        <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap h-auto gap-2 p-0 justify-start rounded-none">
              <TabsTrigger
                value="personal"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 data-active:text-zinc-900 dark:data-active:text-white data-active:border-b-2 data-active:border-zinc-900 dark:data-active:border-[#ACF417] rounded-none transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={UserIcon} size={15} />
                <span>Personal</span>
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 data-active:text-zinc-900 dark:data-active:text-white data-active:border-b-2 data-active:border-zinc-900 dark:data-active:border-[#ACF417] rounded-none transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={DocumentCodeIcon} size={15} />
                <span>Summary</span>
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 data-active:text-zinc-900 dark:data-active:text-white data-active:border-b-2 data-active:border-zinc-900 dark:data-active:border-[#ACF417] rounded-none transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={Award01Icon} size={15} />
                <span>Skills</span>
              </TabsTrigger>
              <TabsTrigger
                value="experience"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 data-active:text-zinc-900 dark:data-active:text-white data-active:border-b-2 data-active:border-zinc-900 dark:data-active:border-[#ACF417] rounded-none transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={Briefcase01Icon} size={15} />
                <span>Experience</span>
              </TabsTrigger>
              <TabsTrigger
                value="education"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 data-active:text-zinc-900 dark:data-active:text-white data-active:border-b-2 data-active:border-zinc-900 dark:data-active:border-[#ACF417] rounded-none transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={GraduationCapIcon} size={15} />
                <span>Education</span>
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 data-active:text-zinc-900 dark:data-active:text-white data-active:border-b-2 data-active:border-zinc-900 dark:data-active:border-[#ACF417] rounded-none transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={CodeCircleIcon} size={15} />
                <span>Projects</span>
              </TabsTrigger>
              <TabsTrigger
                value="certifications"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 data-active:text-zinc-900 dark:data-active:text-white data-active:border-b-2 data-active:border-zinc-900 dark:data-active:border-[#ACF417] rounded-none transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={Certificate01Icon} size={15} />
                <span>Certifications</span>
              </TabsTrigger>
            </TabsList>

            {/* --- Tab 1: Personal --- */}
            <TabsContent value="personal" className="mt-6 space-y-6">
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Contact & Location</CardTitle>
                  <CardDescription className="text-xs">
                    Primary candidate details used for job application submissions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name" className="text-xs font-medium">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        placeholder="e.g. Alex Mercer"
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="alex@example.com"
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-medium">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+1 (555) 019-2834"
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-xs font-medium">Location</Label>
                      <Input
                        id="location"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        placeholder="San Francisco, CA or Remote"
                        className="rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="linkedin_url" className="text-xs font-medium">LinkedIn URL</Label>
                      <Input
                        id="linkedin_url"
                        value={profile.linkedin_url}
                        onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="github_url" className="text-xs font-medium">GitHub URL</Label>
                      <Input
                        id="github_url"
                        value={profile.github_url}
                        onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                        placeholder="https://github.com/..."
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="website_url" className="text-xs font-medium">Website / Portfolio</Label>
                      <Input
                        id="website_url"
                        value={profile.website_url}
                        onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                        placeholder="https://myportfolio.dev"
                        className="rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSavePersonalInfo}
                      disabled={savingSection === "personal"}
                      className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 px-5 py-2 text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      {savingSection === "personal" ? (
                        <span className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Loading03Icon} size={15} className="animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={FloppyDiskIcon} size={15} />
                          Save Personal Info
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Tab 2: Summary --- */}
            <TabsContent value="summary" className="mt-6">
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Professional Summary</CardTitle>
                  <CardDescription className="text-xs">
                    Overview of your career, engineering experience, and technical leadership.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    rows={8}
                    value={profile.summary}
                    onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                    placeholder="Senior Full Stack Software Engineer with extensive experience in cloud architecture and AI agents..."
                    className="rounded-xl text-xs leading-relaxed"
                  />
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSavePersonalInfo}
                      disabled={savingSection === "personal"}
                      className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 px-5 py-2 text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      Save Summary
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Tab 3: Skills --- */}
            <TabsContent value="skills" className="mt-6 space-y-6">
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Skills & Technologies</CardTitle>
                  <CardDescription className="text-xs">
                    Add technologies and frameworks you excel at.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-col sm:flex-row gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <Input
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                      placeholder="e.g. Next.js, TypeScript, PostgreSQL"
                      className="bg-white dark:bg-zinc-950 rounded-xl text-xs"
                    />
                    <Input
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      placeholder="Category (e.g. Frontend)"
                      className="bg-white dark:bg-zinc-950 rounded-xl text-xs sm:w-44"
                    />
                    <Button
                      type="button"
                      onClick={handleAddSkill}
                      className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 rounded-xl px-4 py-2 text-xs cursor-pointer shrink-0"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={15} />
                      Add Skill
                    </Button>
                  </div>

                  {skills.length === 0 ? (
                    <p className="text-zinc-500 text-xs py-4 text-center">No skills logged yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-200"
                        >
                          <span className="font-semibold text-zinc-800 dark:text-zinc-100">{skill.name}</span>
                          <span className="text-[10px] text-zinc-400 bg-zinc-200 dark:bg-zinc-900 px-1.5 py-0.5 rounded">
                            {skill.category || "General"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(idx)}
                            className="text-zinc-400 hover:text-red-400 cursor-pointer ml-1"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      onClick={handleSaveSkills}
                      disabled={savingSection === "skills"}
                      className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 px-5 py-2 text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      Save Skills
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Tab 4: Experience --- */}
            <TabsContent value="experience" className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Positions & Employment ({experiences.length})
                </h3>
                <Button
                  onClick={handleAddExperience}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={15} />
                  Add Position
                </Button>
              </div>

              {experiences.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center rounded-2xl">
                  <p className="text-zinc-500 text-xs">No experience added yet.</p>
                </Card>
              ) : (
                experiences.map((exp, expIdx) => (
                  <Card
                    key={expIdx}
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-sm font-bold">
                        Experience {expIdx + 1}
                      </CardTitle>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(expIdx)}
                        className="text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Delete Experience"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Job Title</Label>
                          <Input
                            value={exp.title}
                            onChange={(e) => handleUpdateExperience(expIdx, "title", e.target.value)}
                            placeholder="e.g. Lead Engineer"
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Company Name</Label>
                          <Input
                            value={exp.company}
                            onChange={(e) => handleUpdateExperience(expIdx, "company", e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            value={exp.start_date}
                            onChange={(e) => handleUpdateExperience(expIdx, "start_date", e.target.value)}
                            placeholder="Jan 2021"
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End Date</Label>
                          <Input
                            value={exp.end_date}
                            onChange={(e) => handleUpdateExperience(expIdx, "end_date", e.target.value)}
                            placeholder="Present"
                            className="rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-semibold">Responsibilities & Achievements</Label>
                          <button
                            type="button"
                            onClick={() => handleAddResponsibility(expIdx)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ACF417] hover:underline cursor-pointer"
                          >
                            <HugeiconsIcon icon={PlusSignIcon} size={12} />
                            Add Bullet Point
                          </button>
                        </div>
                        {(exp.responsibilities || []).map((resp, respIdx) => (
                          <div key={respIdx} className="flex items-start gap-2">
                            <span className="text-[#ACF417] mt-2 font-bold">•</span>
                            <Textarea
                              rows={2}
                              value={resp}
                              onChange={(e) => handleUpdateResponsibility(expIdx, respIdx, e.target.value)}
                              placeholder="Key achievement or responsibility..."
                              className="rounded-xl text-xs leading-relaxed"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveResponsibility(expIdx, respIdx)}
                              className="text-zinc-400 hover:text-red-400 p-1 mt-1 cursor-pointer"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveExperiences}
                  disabled={savingSection === "experiences"}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 px-5 py-2 text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Experience
                </Button>
              </div>
            </TabsContent>

            {/* --- Tab 5: Education --- */}
            <TabsContent value="education" className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Degrees & Education ({educations.length})
                </h3>
                <Button
                  onClick={handleAddEducation}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={15} />
                  Add Education
                </Button>
              </div>

              {educations.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center rounded-2xl">
                  <p className="text-zinc-500 text-xs">No education records added yet.</p>
                </Card>
              ) : (
                educations.map((edu, idx) => (
                  <Card
                    key={idx}
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-sm font-bold">
                        Education {idx + 1}
                      </CardTitle>
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(idx)}
                        className="text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Institution</Label>
                          <Input
                            value={edu.institution}
                            onChange={(e) => handleUpdateEducation(idx, "institution", e.target.value)}
                            placeholder="e.g. Stanford University"
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Degree</Label>
                          <Input
                            value={edu.degree}
                            onChange={(e) => handleUpdateEducation(idx, "degree", e.target.value)}
                            placeholder="e.g. Bachelor of Science"
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Field of Study</Label>
                          <Input
                            value={edu.field_of_study}
                            onChange={(e) => handleUpdateEducation(idx, "field_of_study", e.target.value)}
                            placeholder="e.g. Computer Science"
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Graduation Year</Label>
                            <Input
                              value={edu.end_date}
                              onChange={(e) => handleUpdateEducation(idx, "end_date", e.target.value)}
                              placeholder="2022"
                              className="rounded-xl text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">GPA (Optional)</Label>
                            <Input
                              value={edu.gpa}
                              onChange={(e) => handleUpdateEducation(idx, "gpa", e.target.value)}
                              placeholder="3.9"
                              className="rounded-xl text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveEducation}
                  disabled={savingSection === "education"}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 px-5 py-2 text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Education
                </Button>
              </div>
            </TabsContent>

            {/* --- Tab 6: Projects (Matching the Reference Image Exactly) --- */}
            <TabsContent value="projects" className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Featured Projects ({projects.length})
                </h3>
                <Button
                  onClick={handleAddProject}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={15} />
                  Add Project
                </Button>
              </div>

              {projects.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center rounded-2xl">
                  <p className="text-zinc-500 text-xs">No projects added yet.</p>
                </Card>
              ) : (
                projects.map((proj, idx) => (
                  <Card
                    key={idx}
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Project {idx + 1}
                      </CardTitle>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(idx)}
                        className="text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Delete Project"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Name</Label>
                        <Input
                          value={proj.title}
                          onChange={(e) => handleUpdateProject(idx, "title", e.target.value)}
                          placeholder="e.g. ScaleETL"
                          className="rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-900/50"
                        />
                      </div>

                      {/* URL */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">URL</Label>
                        <Input
                          value={proj.url}
                          onChange={(e) => handleUpdateProject(idx, "url", e.target.value)}
                          placeholder="https://..."
                          className="rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-900/50"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</Label>
                        <Textarea
                          rows={3}
                          value={proj.description}
                          onChange={(e) => handleUpdateProject(idx, "description", e.target.value)}
                          placeholder="High-performance CLI for partitioning, transforming, loading, and searching CSV datasets..."
                          className="rounded-xl text-xs leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/50"
                        />
                      </div>

                      {/* Technologies (comma-separated) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Technologies (comma-separated)
                        </Label>
                        <Input
                          value={(proj.technologies || []).join(", ")}
                          onChange={(e) => {
                            const list = e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean);
                            handleUpdateProject(idx, "technologies", list);
                          }}
                          placeholder="e.g. Rust, ClickHouse, Docker"
                          className="rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-900/50"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProjects}
                  disabled={savingSection === "projects"}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 px-5 py-2 text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Projects
                </Button>
              </div>
            </TabsContent>

            {/* --- Tab 7: Certifications --- */}
            <TabsContent value="certifications" className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Certificates & Credentials ({certifications.length})
                </h3>
                <Button
                  onClick={handleAddCertification}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={15} />
                  Add Certification
                </Button>
              </div>

              {certifications.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center rounded-2xl">
                  <p className="text-zinc-500 text-xs">No certifications added yet.</p>
                </Card>
              ) : (
                certifications.map((cert, idx) => (
                  <Card
                    key={idx}
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm rounded-2xl"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Certification {idx + 1}
                      </CardTitle>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertification(idx)}
                        className="text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Delete Certification"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Name</Label>
                        <Input
                          value={cert.name}
                          onChange={(e) => handleUpdateCertification(idx, "name", e.target.value)}
                          placeholder="e.g. AWS Certified Solutions Architect"
                          className="rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-900/50"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Issuer</Label>
                          <Input
                            value={cert.issuer}
                            onChange={(e) => handleUpdateCertification(idx, "issuer", e.target.value)}
                            placeholder="e.g. Amazon Web Services"
                            className="rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-900/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Issue Date</Label>
                          <Input
                            value={cert.issue_date}
                            onChange={(e) => handleUpdateCertification(idx, "issue_date", e.target.value)}
                            placeholder="2023"
                            className="rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-900/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Credential URL</Label>
                        <Input
                          value={cert.credential_url}
                          onChange={(e) => handleUpdateCertification(idx, "credential_url", e.target.value)}
                          placeholder="https://..."
                          className="rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-900/50"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveCertifications}
                  disabled={savingSection === "certifications"}
                  className="bg-[#ACF417] text-black font-semibold hover:bg-[#ACF417]/90 px-5 py-2 text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Certifications
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
