import { Radio } from "lucide-react";

export default function AuthShell({
  subtitle,
  children,
}: {
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-glass">
            <Radio className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">LiveAffiliate</h1>
          <p className="mt-0.5 text-sm text-muted-fg">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
