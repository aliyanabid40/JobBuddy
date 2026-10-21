import { connection } from "next/server";
import { getResumesList } from "@/features/resume/actions";
import { ResumeList } from "@/components/resume/resume-list";

export const instant = false;

export default async function ResumePage() {
  await connection();
  const res = await getResumesList();
  const resumes = res.ok ? res.data : [];

  return <ResumeList initialResumes={resumes} />;
}
