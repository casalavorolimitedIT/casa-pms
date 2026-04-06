import { ReportsNav } from "./reports-nav";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell">
      <div className="page-container">
        {/* Header */}
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle mt-1">
            Decision-grade reporting across all operational areas with full filter and export support.
          </p>
        </div>

        {/* Sub-nav tabs */}
        <ReportsNav />

        {children}
      </div>
    </div>
  );
}
