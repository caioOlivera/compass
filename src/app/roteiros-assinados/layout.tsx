import { ScriptAfiliados } from "@/components/marketing/script-afiliados";

export default function RoteirosAssinadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScriptAfiliados />
      {children}
    </>
  );
}
