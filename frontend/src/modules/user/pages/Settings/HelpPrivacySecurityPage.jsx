import React, { useState } from 'react';
import { BiChevronDown } from 'react-icons/bi';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getPrivacySecurityFaqs } from '../../../../utils/helpCenterData';

const HelpPrivacySecurityPage = () => {
  const faqs = getPrivacySecurityFaqs();
  const [openFaqId, setOpenFaqId] = useState(faqs[0]?.id || '');

  return (
    <SettingsSubPageLayout title="Privacy and Security">
      <p className="text-[13px] leading-6 text-white/45 mb-5 px-1">
        Common questions about privacy controls, blocking, secure logins, and account protection.
      </p>

      <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
        {faqs.map((faq, index) => {
          const isLast = index === faqs.length - 1;
          const isOpen = openFaqId === faq.id;

          return (
            <button
              key={faq.id}
              type="button"
              onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
              className={`w-full text-left p-4 active:bg-white/5 transition-colors ${
                !isLast ? 'border-b border-white border-opacity-[0.05]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-medium text-white/90">{faq.question}</p>
                <BiChevronDown
                  size={20}
                  className={`text-white/35 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
              {isOpen && <p className="text-[13px] leading-6 text-white/45 mt-3">{faq.answer}</p>}
            </button>
          );
        })}
      </div>
    </SettingsSubPageLayout>
  );
};

export default HelpPrivacySecurityPage;
