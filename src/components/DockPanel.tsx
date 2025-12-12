import { Github } from 'lucide-react';
import './DockPanel.css';

interface DockPanelProps {
  visible: boolean;
}

export function DockPanel({ visible }: DockPanelProps) {
  if (!visible) return null;

  return (
    <div className="dock-panel">
      <div className="dock-content">
        <div className="dock-credit">
          <a href="https://www.qrz.com/db/TA1VAL" target="_blank" rel="noopener noreferrer">TA1VAL</a>
          <span className="separator">•</span>
          <a href="https://github.com/talhaakkaya/grid-square-locator" target="_blank" rel="noopener noreferrer" className="github-link">
            <Github size={12} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
