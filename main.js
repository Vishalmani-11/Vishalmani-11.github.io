function renderHero() {
  const tag = $('tagline');
  const footerTag = $('footer-tagline');
  const pickFirst = (value) => {
    const text = String(value || '').split('|')[0]?.trim() || value || '';
    return text;
  };

  const heroText = profileData?.heroTagline || profileData?.tagline || '';
  if (tag && heroText) {
    const shortTagline = pickFirst(heroText);
    tag.textContent = shortTagline.length > 100 ? shortTagline.substring(0, 100) + '...' : shortTagline;
  }

  if (footerTag && profileData?.tagline) {
    const shortTagline = pickFirst(profileData.tagline);
    footerTag.textContent = shortTagline.length > 80 ? shortTagline.substring(0, 80) + '...' : shortTagline;
  }
}
