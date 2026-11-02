import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Shell, Logo } from '@/components/shell';
import { AuthPage } from '@/pages/auth';
import MyHabits from '@/pages/my-habits';
import Community from '@/pages/community';
import HabitDetail from '@/pages/habit-detail';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (n, err) => ((err as { status?: number })?.status === 401 ? false : n < 2), staleTime: 5000 } },
});

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to, { replace: true }); }, [to, setLocation]);
  return null;
}

function Router() {
  const [location] = useLocation();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60000 } });
  const isAuthRoute = location === '/sign-in' || location === '/sign-up';

  if (me.isLoading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center text-primary">
        <div className="animate-pulse"><Logo /></div>
      </div>
    );
  }

  const user = me.data;
  if (!user) {
    if (location === '/sign-in') return <AuthPage mode="sign-in" />;
    if (location === '/sign-up' || location === '/') return <AuthPage mode="sign-up" />;
    return <Redirect to="/sign-in" />;
  }
  if (isAuthRoute) return <Redirect to="/my-habits" />;

  return (
    <Shell user={user}>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={MyHabits} />
          <Route path="/my-habits" component={MyHabits} />
          <Route path="/community" component={Community} />
          <Route path="/habits/:id">{() => <HabitDetail user={user} />}</Route>
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
