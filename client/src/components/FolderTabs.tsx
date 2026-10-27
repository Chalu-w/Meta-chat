import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.js';

export type FolderFilter = 'all' | 'direct' | 'group' | 'channel';

interface FolderTabsProps {
  activeTab: FolderFilter;
  onSelectTab: (tab: FolderFilter) => void;
  counts: {
    all: number;
    direct: number;
    group: number;
    channel: number;
  };
}

export const FolderTabs: React.FC<FolderTabsProps> = ({
  activeTab,
  onSelectTab,
  counts,
}) => {
  const { t } = useLanguage();

  const tabs: { id: FolderFilter; label: string; count: number }[] = [
    { id: 'all', label: t('allChats'), count: counts.all },
    { id: 'direct', label: t('direct'), count: counts.direct },
    { id: 'group', label: t('groups'), count: counts.group },
    { id: 'channel', label: t('channels'), count: counts.channel },
  ];

  return (
    <div className="folder-tabs-container">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`folder-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="folder-tab-label">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`folder-tab-badge ${isActive ? 'active-badge' : ''}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
