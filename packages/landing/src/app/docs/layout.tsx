import { Sidebar, MobileSidebar } from "@/components/docs/sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 border-r border-white/[0.06] sticky top-0 h-screen overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <MobileSidebar />

      {/* Content */}
      <main className="flex-1 min-w-0 px-6 py-12 lg:px-16">
        <div className="max-w-[720px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
