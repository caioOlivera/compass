import { ScriptAfiliados } from "@/components/marketing/script-afiliados";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScriptAfiliados />
      {children}
    </>
  );
}
