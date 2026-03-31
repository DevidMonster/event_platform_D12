export function buildRecipientGroups(cards, recipientOptions, user) {
  const profileMap = new Map();

  recipientOptions.forEach((person) => {
    const key = String(person.userEmail || '').trim().toLowerCase();
    if (!key) return;
    profileMap.set(key, person);
  });

  const grouped = new Map();

  cards.forEach((card) => {
    const email = String(card.recipientEmail || '').trim().toLowerCase();
    const name = String(card.recipientName || '').trim() || 'Người nhận';
    const key = email || `${name.toLowerCase()}-${card.id}`;
    const profile =
      (email && profileMap.get(email)) ||
      (email && email === String(user?.email || '').trim().toLowerCase()
        ? {
            authorName: user?.displayName || name,
            userEmail: email,
            avatarUrl: user?.photoURL || null
          }
        : null);

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        recipientName: profile?.authorName || name,
        recipientEmail: email || null,
        avatarUrl: profile?.avatarUrl || null,
        cards: []
      });
    }

    grouped.get(key).cards.push(card);
  });

  return Array.from(grouped.values()).sort((left, right) => {
    const leftDate = new Date(left.cards[0]?.createdAt || 0).getTime();
    const rightDate = new Date(right.cards[0]?.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
}

export function buildRecipientHref(group) {
  return `/recipient/${encodeURIComponent(group.key)}`;
}
