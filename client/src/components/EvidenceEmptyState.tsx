import type { LucideIcon } from "lucide-react";

type Step = { label: string; detail: string };

export function EvidenceEmptyState({ icon: Icon, eyebrow, title, description, steps }: { icon: LucideIcon; eyebrow: string; title: string; description: string; steps: Step[] }) {
  return <div className="evidence-empty-state">
    <div className="evidence-empty-icon"><Icon className="size-4" /></div>
    <p className="eyebrow">{eyebrow}</p>
    <h3 className="font-serif text-lg text-[#294837]">{title}</h3>
    <p className="max-w-md text-xs leading-5 text-[#718176]">{description}</p>
    <ol>{steps.map((step, index) => <li key={step.label}><span>{String(index + 1).padStart(2, "0")}</span><p><strong>{step.label}</strong><br />{step.detail}</p></li>)}</ol>
  </div>;
}
