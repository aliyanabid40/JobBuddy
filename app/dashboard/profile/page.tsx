import { connection } from "next/server";
import { getFullProfile } from "@/features/resume/actions";
import { ProfileEditor } from "@/components/profile/profile-editor";

export const instant = false;

export default async function ProfilePage() {
  await connection();
  const profileResult = await getFullProfile();

  const defaultProfileData = {
    profile: {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      github_url: "",
      linkedin_url: "",
      website_url: "",
      summary: "",
    },
    skills: [],
    experiences: [],
    educations: [],
    projects: [],
    certifications: [],
    completeness: 0,
  };

  const initialData = profileResult.ok ? profileResult.data : defaultProfileData;

  return <ProfileEditor initialData={initialData} />;
}
