const PageLoader = () => (
  <div className='flex h-screen w-full flex-col bg-background'>
    {/* Navbar Skeleton */}
    <div className='fixed top-0 left-0 right-0 z-50 h-16 border-b-4 border-primary bg-card px-4'>
      <div className='flex h-full items-center justify-between container mx-auto'>
        <div className='h-6 w-32 animate-pulse rounded bg-primary/20' />
        <div className='hidden md:flex gap-6'>
          <div className='h-4 w-16 animate-pulse rounded bg-muted' />
          <div className='h-4 w-16 animate-pulse rounded bg-muted' />
          <div className='h-4 w-16 animate-pulse rounded bg-muted' />
        </div>
        <div className='h-8 w-24 animate-pulse rounded bg-primary/20' />
      </div>
    </div>

    {/* Page Content Skeleton */}
    <div className='pt-16 container mx-auto px-4 py-8 space-y-6'>
      {/* Page Title */}
      <div className='h-8 w-48 animate-pulse rounded bg-muted' />

      {/* Card Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {[...Array(6)].map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className='rounded-lg border border-border bg-card p-4 space-y-3'
          >
            <div className='h-5 w-3/4 animate-pulse rounded bg-muted' />
            <div className='h-4 w-full animate-pulse rounded bg-muted/70' />
            <div className='h-4 w-5/6 animate-pulse rounded bg-muted/70' />
            <div className='h-8 w-24 animate-pulse rounded bg-primary/20 mt-2' />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PageLoader;
