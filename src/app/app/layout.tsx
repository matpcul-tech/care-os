import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CareCircle — Eleanor Culwell',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
