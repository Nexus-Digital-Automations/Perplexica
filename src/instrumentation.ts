export const register = async () => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      console.log('Running database migrations...');
      await import('./lib/db/migrate');
      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Failed to run database migrations:', error);
    }

    // Config init and poller start are independent — run in parallel
    const [, { startRssPoller }] = await Promise.all([
      import('./lib/config/index'),
      import('./lib/rss/poller'),
    ]);
    startRssPoller();
  }
};
