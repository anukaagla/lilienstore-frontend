type SkeletonBlockProps = {
  className?: string;
};

export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-[1.35rem] bg-[#ece8df] ${className}`}
    />
  );
}

type AppShellSkeletonProps = {
  children: React.ReactNode;
};

function AppShellSkeleton({ children }: AppShellSkeletonProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="px-4 pt-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <SkeletonBlock className="hidden h-12 w-36 sm:block" />
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <SkeletonBlock className="h-3 w-10 rounded-full" />
            <SkeletonBlock className="h-3 w-14 rounded-full" />
            <SkeletonBlock className="h-3 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-20">
        <div className="h-px w-full bg-black/10" />
        {children}
      </main>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2">
        <SkeletonBlock className="h-[320px] w-full sm:h-[420px]" />
        <div className="flex flex-col items-center justify-center gap-5 py-6">
          <SkeletonBlock className="h-28 w-48 sm:h-36 sm:w-60" />
          <SkeletonBlock className="h-11 w-44 rounded-full" />
        </div>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <SkeletonBlock className="h-[280px] w-full sm:h-[360px]" />
        <div className="space-y-4 pt-4">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="h-12 w-full rounded-3xl" />
          <SkeletonBlock className="h-12 w-[92%] rounded-3xl" />
          <SkeletonBlock className="h-12 w-[76%] rounded-3xl" />
        </div>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div className="space-y-4 pt-4">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <SkeletonBlock className="h-12 w-full rounded-3xl" />
          <SkeletonBlock className="h-12 w-[88%] rounded-3xl" />
          <SkeletonBlock className="h-12 w-[72%] rounded-3xl" />
        </div>
        <SkeletonBlock className="h-[280px] w-full sm:h-[360px]" />
      </section>
    </AppShellSkeleton>
  );
}

export function MarketPageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-8">
        <div className="flex items-center justify-end gap-8">
          <SkeletonBlock className="h-3 w-16 rounded-full" />
          <SkeletonBlock className="h-3 w-12 rounded-full" />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-3">
              <SkeletonBlock className="aspect-[4/5] w-full" />
              <SkeletonBlock className="h-4 w-2/3 rounded-full" />
              <SkeletonBlock className="h-3 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </AppShellSkeleton>
  );
}

export function ProductPageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-10 grid gap-8 lg:grid-cols-[88px_minmax(0,1fr)_320px]">
        <div className="order-2 flex flex-wrap gap-4 lg:order-1 lg:flex-col">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-20 w-16 rounded-2xl lg:h-24 lg:w-20" />
          ))}
        </div>
        <SkeletonBlock className="order-1 h-[420px] w-full lg:order-2 lg:h-[68vh]" />
        <div className="order-3 space-y-5 pt-2">
          <SkeletonBlock className="h-5 w-2/3 rounded-full" />
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-px w-full rounded-none" />
          <SkeletonBlock className="h-10 w-full rounded-full" />
          <SkeletonBlock className="h-10 w-full rounded-full" />
          <SkeletonBlock className="h-12 w-full rounded-full" />
          <SkeletonBlock className="h-16 w-full rounded-3xl" />
          <SkeletonBlock className="h-16 w-full rounded-3xl" />
        </div>
      </section>
    </AppShellSkeleton>
  );
}

export function ProfilePageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-10 grid gap-8 lg:grid-cols-[220px_1px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-4 w-28 rounded-full" />
        </div>
        <div className="hidden bg-black/10 lg:block" />
        <div className="space-y-6">
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <div className="grid gap-6 sm:grid-cols-2">
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
          </div>
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <div className="flex gap-3">
            <SkeletonBlock className="h-12 flex-1 rounded-full" />
            <SkeletonBlock className="h-12 flex-1 rounded-full" />
          </div>
        </div>
      </section>
    </AppShellSkeleton>
  );
}

export function ShoppingBagPageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24px_360px]">
        <div className="space-y-6">
          <SkeletonBlock className="h-3 w-16 rounded-full" />
          <SkeletonBlock className="h-4 w-full rounded-full" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-4 border-b border-black/10 pb-6">
              <SkeletonBlock className="h-24 w-20 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="h-4 w-2/3 rounded-full" />
                <SkeletonBlock className="h-3 w-20 rounded-full" />
                <SkeletonBlock className="h-3 w-16 rounded-full" />
                <SkeletonBlock className="h-9 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden bg-black/10 lg:block" />
        <div className="space-y-4">
          <SkeletonBlock className="h-5 w-36 rounded-full" />
          <SkeletonBlock className="h-32 w-full rounded-3xl" />
          <SkeletonBlock className="h-12 w-full rounded-full" />
        </div>
      </section>
    </AppShellSkeleton>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SkeletonBlock className="h-4 w-44 rounded-full" />
          <SkeletonBlock className="h-24 w-full rounded-3xl" />
          <div className="grid gap-6 sm:grid-cols-2">
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
          </div>
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <div className="grid gap-6 sm:grid-cols-2">
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
          </div>
          <SkeletonBlock className="h-24 w-full rounded-3xl" />
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-5 w-36 rounded-full" />
          <SkeletonBlock className="h-40 w-full rounded-3xl" />
          <SkeletonBlock className="h-12 w-full rounded-full" />
        </div>
      </section>
    </AppShellSkeleton>
  );
}

export function StaticContentPageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-12 space-y-8">
        <SkeletonBlock className="mx-auto h-6 w-52 rounded-full" />
        <SkeletonBlock className="h-56 w-full rounded-[2rem]" />
        <div className="space-y-4">
          <SkeletonBlock className="h-5 w-full rounded-full" />
          <SkeletonBlock className="h-5 w-[94%] rounded-full" />
          <SkeletonBlock className="h-5 w-[88%] rounded-full" />
          <SkeletonBlock className="h-5 w-[82%] rounded-full" />
        </div>
      </section>
    </AppShellSkeleton>
  );
}

export function ContactPageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mt-12 grid gap-12 md:grid-cols-2">
        <div className="space-y-5">
          <SkeletonBlock className="h-5 w-full rounded-full" />
          <SkeletonBlock className="h-5 w-[88%] rounded-full" />
          <SkeletonBlock className="h-16 w-full rounded-3xl" />
          <SkeletonBlock className="h-16 w-full rounded-3xl" />
          <SkeletonBlock className="h-16 w-full rounded-3xl" />
        </div>
        <div className="space-y-5">
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <SkeletonBlock className="h-40 w-full rounded-3xl" />
          <SkeletonBlock className="h-12 w-40 rounded-full" />
        </div>
      </section>
    </AppShellSkeleton>
  );
}

export function RegisterPageSkeleton() {
  return (
    <AppShellSkeleton>
      <section className="mx-auto mt-12 max-w-xl space-y-6">
        <SkeletonBlock className="mx-auto h-6 w-40 rounded-full" />
        <div className="grid gap-6 sm:grid-cols-2">
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
        </div>
        <SkeletonBlock className="h-12 w-full rounded-2xl" />
        <SkeletonBlock className="h-12 w-full rounded-2xl" />
        <SkeletonBlock className="h-12 w-full rounded-2xl" />
        <SkeletonBlock className="h-12 w-full rounded-full" />
      </section>
    </AppShellSkeleton>
  );
}
