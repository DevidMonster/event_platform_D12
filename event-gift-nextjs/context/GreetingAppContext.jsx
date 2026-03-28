'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, hasFirebaseConfig } from '../lib/firebase';
import { seedCards } from '../lib/mock-data';
import { cardTemplates as fallbackTemplates } from '../lib/card-templates';
import { AI_CARD_FORM_SPEC, AI_CARD_IMAGE_SPEC, buildAiSuggestionPackage, normalizeAiPromptText } from '../lib/ai-card-script';

const GreetingAppContext = createContext(null);

const API_URL = String(process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');

function buildRecipientFallback(email) {
  const prefix = String(email || '').split('@')[0].trim();
  if (!prefix) return 'Người dùng';

  return prefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function GreetingAppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');
  const [cards, setCards] = useState(seedCards);
  const [templates, setTemplates] = useState(fallbackTemplates);
  const [directoryPeople, setDirectoryPeople] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryMessage, setDirectoryMessage] = useState('');
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsMessage, setCardsMessage] = useState('');
  const [mailEnabled, setMailEnabled] = useState(false);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setAuthLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDirectory() {
      if (!API_URL) {
        if (isMounted) {
          setDirectoryMessage('Thiếu cấu hình API.');
        }
        return;
      }

      setDirectoryLoading(true);
      setDirectoryMessage('');

      try {
        const response = await fetch(`${API_URL}/api/public/directory/people`, {
          cache: 'no-store'
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || 'Không tải được danh sách người nhận.');
        }

        if (!isMounted) return;
        setDirectoryPeople(Array.isArray(payload.people) ? payload.people : []);
      } catch (error) {
        if (!isMounted) return;
        setDirectoryPeople([]);
        setDirectoryMessage(error.message || 'Không tải được danh sách người nhận.');
      } finally {
        if (isMounted) {
          setDirectoryLoading(false);
        }
      }
    }

    loadDirectory();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCardsAndTemplates() {
      if (!API_URL) return;

      setCardsLoading(true);
      setCardsMessage('');

      try {
        const search = new URLSearchParams();
        if (user?.email) search.set('viewerEmail', user.email);
        if (user?.uid) search.set('viewerUid', user.uid);

        const response = await fetch(`${API_URL}/api/public/cards/bootstrap?${search.toString()}`, {
          cache: 'no-store'
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || 'Không tải được dữ liệu thiệp.');
        }

        if (!isMounted) return;
        setTemplates(Array.isArray(payload.templates) && payload.templates.length ? payload.templates : fallbackTemplates);
        setCards(Array.isArray(payload.cards) ? payload.cards : []);
        setMailEnabled(Boolean(payload.mailEnabled));
      } catch (error) {
        if (!isMounted) return;
        setCardsMessage(error.message || 'Không tải được dữ liệu thiệp.');
      } finally {
        if (isMounted) {
          setCardsLoading(false);
        }
      }
    }

    loadCardsAndTemplates();

    return () => {
      isMounted = false;
    };
  }, [user?.email, user?.uid]);

  async function handleGoogleLogin() {
    setAuthMessage('');
    if (!hasFirebaseConfig || !auth || !googleProvider) {
      setAuthMessage('Thiếu cấu hình Firebase Auth.');
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
      setAuthMessage('Đăng nhập Google thành công.');
    } catch (error) {
      setAuthMessage(error.message || 'Đăng nhập Google thất bại.');
    }
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    setAuthMessage('');
  }

  async function generateAiMessage({ messagePrompt, templateTitle, templateCategory }) {
    if (!API_URL) {
      throw new Error('Thiếu cấu hình API.');
    }

    const response = await fetch(`${API_URL}/api/public/cards/ai-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messagePrompt,
        templateTitle,
        templateCategory
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message || 'Không tạo được nội dung AI.');
    }

    return payload?.suggestion;
  }

  async function sendCard(payload) {
    const activeTemplate = templates.find((item) => item.id === payload.templateId) || fallbackTemplates[0];

    if (!API_URL) {
      const senderUid = String(user?.uid || user?.email || '').trim();
      const nextCard = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recipientName: payload.recipientName.trim(),
        recipientEmail: payload.recipientEmail.trim().toLowerCase(),
        message: payload.message.trim(),
        templateId: activeTemplate.id,
        imageUrl: activeTemplate.imageUrl,
        templateTitle: activeTemplate.title,
        templateCategory: activeTemplate.category,
        templateAccent: activeTemplate.accent,
        templateSurface: activeTemplate.surface,
        aiPrompt: normalizeAiPromptText(payload.aiPrompt),
        senderUid,
        senderEmail: String(user?.email || '').trim().toLowerCase() || null,
        senderName: user?.displayName || user?.email || 'Ẩn danh',
        mailStatus: 'skipped',
        createdAt: new Date().toISOString()
      };
      setCards((prev) => [nextCard, ...prev]);
      return nextCard;
    }

    const response = await fetch(`${API_URL}/api/public/cards/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientName: payload.recipientName,
        recipientEmail: payload.recipientEmail,
        message: payload.message,
        templateId: activeTemplate.id,
        aiPrompt: normalizeAiPromptText(payload.aiPrompt),
        userUid: user?.uid || null,
        userEmail: user?.email || null,
        authorName: user?.displayName || user?.email || 'Ẩn danh'
      })
    });

    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responsePayload?.message || 'Không gửi được thiệp.');
    }

    const nextCard = responsePayload?.card;
    if (nextCard) {
      setCards((prev) => [nextCard, ...prev.filter((item) => item.id !== nextCard.id)]);
    }
    setMailEnabled(Boolean(responsePayload?.mailEnabled));
    return nextCard;
  }

  const inboxCards = useMemo(() => cards, [cards]);
  const myReceivedCards = useMemo(() => {
    const email = String(user?.email || '').trim().toLowerCase();
    if (!email) return [];
    return cards.filter((card) => String(card.recipientEmail || '').trim().toLowerCase() === email);
  }, [cards, user]);
  const mySentCards = useMemo(() => {
    const senderEmail = String(user?.email || '').trim().toLowerCase();
    const senderUid = String(user?.uid || '').trim();
    if (!senderEmail && !senderUid) return [];
    return cards.filter((card) => {
      const cardSenderEmail = String(card.senderEmail || '').trim().toLowerCase();
      const cardSenderUid = String(card.senderUid || '').trim();
      return (senderEmail && cardSenderEmail === senderEmail) || (senderUid && cardSenderUid === senderUid);
    });
  }, [cards, user]);

  const recipientOptions = useMemo(
    () =>
      directoryPeople.map((person) => ({
        ...person,
        authorName: String(person.authorName || '').trim() || buildRecipientFallback(person.userEmail)
      })),
    [directoryPeople]
  );

  const value = {
    user,
    authLoading,
    authMessage,
    hasFirebaseConfig,
    templates,
    inboxCards,
    myReceivedCards,
    mySentCards,
    recipientOptions,
    directoryLoading,
    directoryMessage,
    cardsLoading,
    cardsMessage,
    mailEnabled,
    apiReady: Boolean(API_URL),
    aiCardImageSpec: AI_CARD_IMAGE_SPEC,
    aiCardFormSpec: AI_CARD_FORM_SPEC,
    handleGoogleLogin,
    handleLogout,
    generateAiMessage,
    sendCard,
    buildAiSuggestion: buildAiSuggestionPackage
  };

  return <GreetingAppContext.Provider value={value}>{children}</GreetingAppContext.Provider>;
}

export function useGreetingApp() {
  const context = useContext(GreetingAppContext);
  if (!context) {
    throw new Error('useGreetingApp must be used within GreetingAppProvider');
  }
  return context;
}
