import { readAdminConfig, writeAdminConfig } from './adminConfigStorage';

const getLoggedInUser = () => {
  const user = localStorage.getItem('jhumroo_user');
  return user ? JSON.parse(user) : null;
};

export const CURRENT_CHAT_USERNAME = getLoggedInUser()?.username || 'user';

const getFallbackDisplayName = (username) =>
  username
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || username;

const getChatConfig = () => {
  const config = readAdminConfig();
  return config?.inbox?.chat || { users: [], threads: [] };
};

const persistChatConfig = (chatConfig) => {
  const currentConfig = readAdminConfig();
  writeAdminConfig({
    ...currentConfig,
    inbox: {
      ...currentConfig.inbox,
      chat: chatConfig,
    },
  });
};

const sortThreads = (threads) =>
  [...threads].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

const getUserMap = () => {
  const map = new Map();
  const chatUsers = getChatConfig().users || [];
  chatUsers.forEach((user) => {
    map.set(user.username, user);
  });
  return map;
};

const enrichUser = (username) => {
  const userMap = getUserMap();
  const knownUser = userMap.get(username);

  if (knownUser) {
    return knownUser;
  }

  return {
    username,
    displayName: getFallbackDisplayName(username),
    subtitle: 'Start a conversation',
    followers: '0',
  };
};

const buildStarterThread = (username) => {
  const user = enrichUser(username);
  const timestamp = new Date().toISOString();

  return {
    username,
    unreadCount: 0,
    updatedAt: timestamp,
    messages: [
      {
        id: Date.now(),
        sender: 'them',
        text: `Hi! This is @${user.username}.`,
        createdAt: timestamp,
      },
    ],
  };
};

const getLastMessage = (thread) => thread.messages[thread.messages.length - 1];

export const formatThreadTimestamp = (isoString) => {
  const timestamp = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffMs < 60 * 1000) {
    return 'Now';
  }

  if (diffHours < 24) {
    return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (diffDays < 7) {
    return timestamp.toLocaleDateString([], { weekday: 'short' });
  }

  return timestamp.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export const formatBubbleTimestamp = (isoString) =>
  new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const getChatUsers = () =>
  (getChatConfig().users || []).filter((user) => user.username !== CURRENT_CHAT_USERNAME).sort((left, right) =>
    left.displayName.localeCompare(right.displayName)
  );

export const getChatThreads = () =>
  sortThreads(getChatConfig().threads || []).map((thread) => {
    const user = enrichUser(thread.username);
    const lastMessage = getLastMessage(thread);

    return {
      ...thread,
      ...user,
      preview: lastMessage?.text || 'Start chatting',
      previewTime: formatThreadTimestamp(thread.updatedAt),
    };
  });

export const ensureChatThread = (username) => {
  const chatConfig = getChatConfig();
  const threads = chatConfig.threads || [];
  const existingThread = threads.find((thread) => thread.username === username);

  if (existingThread) {
    return {
      ...existingThread,
      ...enrichUser(username),
    };
  }

  const newThread = buildStarterThread(username);
  persistChatConfig({ ...chatConfig, threads: [...threads, newThread] });

  return {
    ...newThread,
    ...enrichUser(username),
  };
};

export const getChatThread = (username) => {
  const thread = ensureChatThread(username);
  return {
    ...thread,
    ...enrichUser(username),
  };
};

export const markChatThreadRead = (username) => {
  const chatConfig = getChatConfig();
  const threads = chatConfig.threads || [];
  const updatedThreads = threads.map((thread) =>
    thread.username === username
      ? {
          ...thread,
          unreadCount: 0,
        }
      : thread
  );

  persistChatConfig({ ...chatConfig, threads: updatedThreads });
  return getChatThread(username);
};

export const sendChatMessage = (username, text) => {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return getChatThread(username);
  }

  const thread = ensureChatThread(username);
  const now = new Date().toISOString();
  const nextMessage = {
    id: Date.now(),
    sender: 'me',
    text: trimmedText,
    createdAt: now,
  };

  const chatConfig = getChatConfig();
  const threads = chatConfig.threads || [];
  const nextThreads = threads.map((item) =>
    item.username === username
      ? {
          ...item,
          unreadCount: 0,
          updatedAt: now,
          messages: [...thread.messages, nextMessage],
        }
      : item
  );

  persistChatConfig({ ...chatConfig, threads: nextThreads });
  return getChatThread(username);
};
