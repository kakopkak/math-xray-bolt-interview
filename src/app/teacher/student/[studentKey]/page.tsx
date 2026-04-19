import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { resolveTeacherRequestContext } from '@/lib/request-context';
import { buildStudentProfile } from '@/lib/student-profile';
import StudentClient from './student-client';

type PageProps = {
  params: Promise<{ studentKey: string }>
};

export default async function StudentPage({ params }: PageProps) {
  const { studentKey } = await params;
  await connectDB();

  const requestHeaders = await headers();
  const context = await resolveTeacherRequestContext({ headers: requestHeaders });
  if (!context) {
    redirect('/login');
  }

  const profile = await buildStudentProfile({
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
    studentKey,
  });

  return (
    <StudentClient
      studentKey={studentKey}
      initialProfile={JSON.parse(JSON.stringify(profile))}
    />
  );
}