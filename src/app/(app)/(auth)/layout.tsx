export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container flex min-h-[calc(100vh-3.5rem)] min-h-[calc(100dvh-3.5rem)] items-center justify-center py-12">
      {children}
    </div>
  );
}
