export type WorkbenchSection = 'overview' | 'data' | 'analyze' | 'reports' | 'exports';

type WorkbenchNavProps = {
  activeSection: WorkbenchSection;
  hasUpload: boolean;
  onSectionChange: (section: WorkbenchSection) => void;
};

const sections: Array<{ key: WorkbenchSection; label: string; detail: string; readyDetail?: string }> = [
  { key: 'overview', label: 'Home', detail: 'Start here' },
  { key: 'data', label: 'Data', detail: 'Upload and review' },
  { key: 'analyze', label: 'Analyze', detail: 'Upload to unlock', readyDetail: 'Methods ready' },
  { key: 'reports', label: 'Reports', detail: 'Build a view' },
  { key: 'exports', label: 'Downloads', detail: 'Save results' },
];

export function WorkbenchNav({ activeSection, hasUpload, onSectionChange }: WorkbenchNavProps) {
  return (
    <nav className="workbench-nav" aria-label="BizDATA workspace sections">
      {sections.map((section) => (
        <button
          className={activeSection === section.key ? 'active' : undefined}
          data-tooltip={section.key === 'analyze' && hasUpload ? section.readyDetail : section.detail}
          key={section.key}
          onClick={() => onSectionChange(section.key)}
          type="button"
        >
          <strong>{section.label}</strong>
          <span>{section.key === 'analyze' && hasUpload ? section.readyDetail : section.detail}</span>
        </button>
      ))}
    </nav>
  );
}


