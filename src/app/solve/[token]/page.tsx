import SolveClient from './solve-client';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SolvePage({ params }: PageProps) {
  const { token } = await params;

  return <SolveClient token={token} />;
}