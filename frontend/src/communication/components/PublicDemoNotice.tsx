/** Compiled into the dedicated demo image only. */
export function PublicDemoNotice() {
  if (import.meta.env.VITE_PUBLIC_DEMO !== "true") return null;
  return <aside aria-label="Public demo notice" style={{
    position: "fixed", bottom: 8, right: 8, zIndex: 40,
    padding: "6px 12px", borderRadius: 8, fontSize: 12,
    background: "#fff8d6", color: "#433500", border: "1px solid #d5b93f",
  }}>Public demo · Synthetic data only · Do not upload real medical records</aside>;
}
