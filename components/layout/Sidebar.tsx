"use client";

export type ViewId = "overview" | "analyze" | "workflow";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "analyze",
    label: "Analyze",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    id: "workflow",
    label: "Workflow",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="12" width="6" height="6" rx="1" />
        <rect x="15" y="4" width="6" height="6" rx="1" />
        <rect x="15" y="14" width="6" height="6" rx="1" />
        <path d="M9 15h3a2 2 0 0 0 2-2v-3" />
      </svg>
    ),
  },
];

interface SidebarProps {
  active: ViewId;
  onNavigate: (view: ViewId) => void;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#f0b90b]/30 bg-gradient-to-b from-[#f0b90b]/20 to-[#f0b90b]/5">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-[#f0b90b]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 17l5-5 4 4 6-7" />
          <path d="M16 9h4v4" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight text-zinc-100">
          Sentinel
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Market Intelligence
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] md:flex">
      <BrandMark />
      <nav
        className="flex flex-1 flex-col gap-1 p-3"
        aria-label="Primary navigation"
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={active === item.id ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b] ${
              active === item.id
                ? "bg-[var(--surface-raised)] text-[#f0b90b] shadow-[inset_0_0_0_1px_rgba(240,185,11,0.25)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#f0b90b]">
            <span className="h-1 w-1 rounded-full bg-[#f0b90b]" aria-hidden="true" />
            System Online
          </div>
          <p className="text-[11px] leading-5 text-[var(--muted)]">
            Research and decision-support only. Not financial advice.
          </p>
        </div>
      </div>
    </aside>
  );
}

interface MobileNavProps {
  active: ViewId;
  onNavigate: (view: ViewId) => void;
}

export function MobileNav({ active, onNavigate }: MobileNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur md:hidden"
      aria-label="Primary navigation"
    >
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          aria-current={active === item.id ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition focus-visible:outline-none ${
            active === item.id ? "text-[#f0b90b]" : "text-[var(--muted)]"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export { NAV_ITEMS };
