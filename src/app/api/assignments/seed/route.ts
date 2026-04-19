import { seedDemoAssignmentDataset } from '@/scripts/seed';
import { createLogger, resolveRequestId } from '@/lib/logger';

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  const log = createLogger('api/assignments/seed', { requestId });
  const expectedToken = process.env.DEMO_SEED_TOKEN;
  const providedToken = request.headers.get('x-demo-token');

  const isTokenValid = Boolean(expectedToken && providedToken && providedToken === expectedToken);
  const allowInProd = !(process.env.NODE_ENV === 'production') || process.env.ALLOW_DEMO_SEED === '1';

  // If token not valid and seeding is not explicitly allowed in production, reject.
  if (!isTokenValid && !allowInProd) {
    // Prefer returning a 401 when token is missing/invalid to help debugging.
    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      return Response.json(
        { error: 'Demo lähtestamise võti on puudu või vale.' },
        { status: 401 }
      );
    }

    // Fallback denial
    return Response.json(
      { error: 'Demo lähtestamine on tootmises keelatud.' },
      { status: 403 }
    );
  }

  try {
    const { assignmentId } = await seedDemoAssignmentDataset();
    log.info('demo_seeded', { assignmentId });
    return Response.json({ assignmentId }, { status: 201, headers: { 'X-Request-Id': requestId } });
  } catch (error: unknown) {
    log.error('demo_seed_failed', undefined, error);
    return Response.json({ error: 'Demo andmestiku loomine ebaõnnestus.' }, { status: 500 });
  }
}
