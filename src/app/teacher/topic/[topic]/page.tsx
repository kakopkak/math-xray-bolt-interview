import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import TopicNotebook from '@/components/teacher/topic-notebook';
import { resolveTeacherRequestContext } from '@/lib/request-context';

type PageProps = {
  params: Promise<{ topic: string }>;
};

export default async function TeacherTopicPage({ params }: PageProps) {
  const { topic } = await params;
  const requestHeaders = await headers();
  const context = await resolveTeacherRequestContext({ headers: requestHeaders });

  if (!context) {
    redirect('/login');
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <TopicNotebook topic={topic} />
    </div>
  );
}