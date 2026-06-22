import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Parses a caption string and renders #hashtags and @mentions as clickable links.
 * All other text is rendered as plain text spans.
 */
const CaptionRenderer = ({ text, className = '' }) => {
  const navigate = useNavigate();

  if (!text) return null;

  // Split text into tokens: plain text, #hashtags, @mentions
  const tokenRegex = /(#[a-zA-Z0-9_\u00C0-\u024F]+|@[a-zA-Z0-9_.]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Plain text before this token
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith('#')) {
      parts.push({ type: 'hashtag', value: token, slug: token.slice(1) });
    } else if (token.startsWith('@')) {
      parts.push({ type: 'mention', value: token, username: token.slice(1) });
    }

    lastIndex = match.index + token.length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'hashtag') {
          return (
            <span
              key={i}
              className="text-[#fe2c55] font-semibold cursor-pointer hover:underline pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/search?q=${encodeURIComponent(part.slug)}&tab=hashtags`);
              }}
            >
              {part.value}
            </span>
          );
        }
        if (part.type === 'mention') {
          return (
            <span
              key={i}
              className="text-[#25f4ee] font-semibold cursor-pointer hover:underline pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/${part.username}`);
              }}
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
};

export default CaptionRenderer;
