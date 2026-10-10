import { Suspense } from "react";
import { NavTabs } from "@/components/app/NavTabs";
import { UserMenu } from "@/components/app/UserMenu";
import { Wordmark } from "@/components/Wordmark";
import { getCurrentUser } from "@/lib/auth/user";

async function CurrentUserMenu() {
  const user = await getCurrentUser();
  return <UserMenu user={user} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-navy px-3 py-2 text-on-navy focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Wordmark href="/contacts" compact />
          <NavTabs />
          <div className="ml-auto">
            <Suspense fallback={<div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" aria-hidden="true" />}>
              <CurrentUserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
