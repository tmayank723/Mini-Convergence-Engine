import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';

import { AssistantChat } from './AssistantChat';
import styles from './Assistant.module.scss';
import type { Reading } from './reading.models';

interface Props {
  reading: Reading | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Right-hand column for grounded Q&A; not an overlay. */
export function ReadingAssistant({ reading, open, onOpenChange }: Props) {
  const [chatKey, setChatKey] = useState(0);

  if (!open) {
    return null;
  }

  return (
    <aside className={styles.rail} aria-label="Reading companion">
      <header className={styles.panelHead}>
        <div className={styles.panelTitle}>
          <span className={styles.panelIcon}>
            <AutoAwesomeIcon fontSize="small" />
          </span>
          <div>
            <h2>Reading companion</h2>
            <p>
              {reading ? 'Ask about the results below' : 'Ask about how this page works'}
            </p>
          </div>
        </div>
        <div className={styles.panelActions}>
          <IconButton
            size="small"
            aria-label="New conversation"
            onClick={() => setChatKey((k) => k + 1)}
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Close assistant"
            onClick={() => onOpenChange(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </header>

      <div className={styles.panelBody}>
        <AssistantChat
          key={`${chatKey}-${reading?.full_name ?? 'none'}-${reading?.date_of_birth ?? ''}`}
          reading={reading}
        />
      </div>
    </aside>
  );
}
