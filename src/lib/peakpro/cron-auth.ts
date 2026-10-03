export function authorizePeakProCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === 'development';

  const auth = request.headers.get('authorization')?.trim();
  if (auth?.toLowerCase() === `bearer ${secret}`.toLowerCase()) return true;

  const url = new URL(request.url);
  const querySecret =
    url.searchParams.get('cron_secret')?.trim() ?? url.searchParams.get('secret')?.trim();
  return querySecret === secret;
}
