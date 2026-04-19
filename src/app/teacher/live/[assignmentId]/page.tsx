import LiveClient from './live-client';

type PageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default async function LivePage({ params }: PageProps) {
  const { assignmentId } = await params;

  return <LiveClient assignmentId={assignmentId} />;
}