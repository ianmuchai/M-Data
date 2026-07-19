export type WorkbenchSection = 'overview' | 'data' | 'analyze' | 'reports' | 'exports';

type WorkbenchNavProps = {
  activeSection: WorkbenchSection;
  hasUpload: boolean;
  onSectionChange: (section: WorkbenchSection) => void;
};

const sections: Array<{ key: WorkbenchSection; label: string; detail: string }> = [
  { key: 'overview', label: 'Overview', detail: 'Command center' },
  { key: 'data', label: 'Data', detail: 'Uploads and profiling' },
  { key: 'analyze', label: 'Analyze', detail: 'Models and methods' },
  { key: 'reports', label: 'Reports', detail: 'Builder lite' },
  { key: 'exports', label: 'Exports', detail: 'Files and outputs' },
];

export function WorkbenchNav({ activeSection, hasUpload, onSectionChange }: WorkbenchNavProps) {
  return (
    <nav className="workbench-nav" aria-label="M-Data workspace sections">
      {sections.map((section) => (
        <button
          className={activeSection === section.key ? 'active' : undefined}
          data-tooltip={section.detail}
          key={section.key}
          onClick={() => onSectionChange(section.key)}
          type="button"
        >
          <strong>{section.label}</strong>
          <span>{section.key === 'analyze' && hasUpload ? 'Ready' : section.detail}</span>
        </button>
      ))}
    </nav>
  );
}
