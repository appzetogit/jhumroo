import React from 'react';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getSafetyTopics } from '../../../../utils/helpCenterData';

const SafetyCenterPage = () => {
  const safetyTopics = getSafetyTopics();

  return (
    <SettingsSubPageLayout title="Safety Center">
      <p className="text-[13px] leading-6 text-white/45 mb-5 px-1">
        Explore quick guidance to protect your account and create a safer experience on Jhumroo.
      </p>

      <div className="space-y-3">
        {safetyTopics.map((topic) => (
          <div key={topic.id} className="bg-[#242424] rounded-[18px] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[15px] font-semibold text-white">{topic.title}</p>
              <span className="px-3 py-1 rounded-full bg-white/6 border border-white/10 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 shrink-0">
                {topic.badge}
              </span>
            </div>
            <p className="text-[13px] leading-6 text-white/50">{topic.description}</p>
          </div>
        ))}
      </div>
    </SettingsSubPageLayout>
  );
};

export default SafetyCenterPage;
