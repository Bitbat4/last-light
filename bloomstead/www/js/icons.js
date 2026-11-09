/* Bloomstead — inline SVG icon set, injected as CSS classes (.ico-NAME). */
(function () {
  const S = (body, vb = '0 0 24 24') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
  const OL = 'stroke="#4a3b33" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"';
  const petals = (fill) => [0, 72, 144, 216, 288].map((a) => `<ellipse cx="12" cy="6.6" rx="3.6" ry="5" fill="${fill}" ${OL} transform="rotate(${a} 12 12)"/>`).join('');
  const ICONS = {
    petal: S(`${petals('#ff8fb1')}<circle cx="12" cy="12" r="3" fill="#ffd84d" ${OL}/>`),
    gem: S(`<path d="M5 9 8.5 4h7L19 9l-7 11z" fill="#7cc8ff" ${OL}/><path d="M5 9h14M8.5 4 12 9l3.5-5M12 9v11" fill="none" stroke="#3a7fc4" stroke-width="1"/><path d="M8.5 4 5 9h4.5z" fill="#b8e4ff"/>`),
    gear: S(`<path d="M12 2.5l1.6 2.3 2.7-.6.6 2.7 2.4 1.4-1 2.6 1 2.6-2.4 1.4-.6 2.7-2.7-.6L12 21.5l-1.6-2.3-2.7.6-.6-2.7-2.4-1.4 1-2.6-1-2.6 2.4-1.4.6-2.7 2.7.6z" fill="#fff" ${OL}/><circle cx="12" cy="12" r="3.2" fill="#ffd84d" ${OL}/>`),
    pause: S(`<rect x="6" y="5" width="4" height="14" rx="1.5" fill="#fff" ${OL}/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="#fff" ${OL}/>`),
    crown: S(`<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#ffd23f" ${OL}/>`),
    bud: S(`<ellipse cx="8" cy="17" rx="4" ry="2" fill="#2fa86a" transform="rotate(-30 8 17)"/><ellipse cx="16" cy="17" rx="4" ry="2" fill="#2fa86a" transform="rotate(30 16 17)"/><path d="M12 3c5 4 4.5 10 0 13-4.5-3-5-9 0-13z" fill="#ff8fb8" ${OL}/>`),
    undo: S(`<path d="M9 5 4 10l5 5" fill="none" stroke="#7652cc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14a5.5 5.5 0 0 1 0 11h-3" fill="none" stroke="#7652cc" stroke-width="3" stroke-linecap="round"/>`),
    reroll: S(`<path d="M4 8h11l-3-3M20 16H9l3 3" fill="none" stroke="#7652cc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="8" r="2" fill="#7652cc"/><circle cx="6" cy="16" r="2" fill="#7652cc"/>`),
    trowel: S(`<path d="M13 11 20 4" stroke="#8a5a3b" stroke-width="3.4" stroke-linecap="round"/><path d="M14.5 9.5 5 12l-1 8 8-1 2.5-9.5z" fill="#e8eef5" ${OL}/>`),
    gift: S(`<rect x="3.5" y="9" width="17" height="11" rx="2" fill="#ff6b8f" ${OL}/><rect x="2.5" y="6.5" width="19" height="4" rx="1.5" fill="#ff8fab" ${OL}/><path d="M12 6.5V20" stroke="#ffd23f" stroke-width="3"/><path d="M12 6.5C9 2 5 4 8 6.5M12 6.5c3-4.5 7-2.5 4 0" fill="none" ${OL}/>`),
    wheel: S(`<circle cx="12" cy="12" r="9" fill="#fff" ${OL}/><path d="M12 12V3a9 9 0 0 1 7.8 4.5zM12 12l7.8 4.5A9 9 0 0 1 12 21zM12 12 4.2 16.5A9 9 0 0 1 4.2 7.5z" fill="#ff8fb1"/><path d="M12 12 19.8 7.5A9 9 0 0 1 19.8 16.5zM12 12v9a9 9 0 0 1-7.8-4.5zM12 12 4.2 7.5A9 9 0 0 1 12 3z" fill="#ffd84d"/><circle cx="12" cy="12" r="2.4" fill="#fff" ${OL}/>`),
    chest: S(`<rect x="3" y="10" width="18" height="10" rx="2" fill="#c98d5c" ${OL}/><path d="M3 10a9 5 0 0 1 18 0z" fill="#e0a872" ${OL}/><rect x="10" y="9" width="4" height="5" rx="1" fill="#ffd23f" ${OL}/><circle cx="7" cy="6" r="1.2" fill="#7cc8ff"/><circle cx="17" cy="5" r="1.2" fill="#ff8fb1"/>`),
    noads: S(`<circle cx="12" cy="12" r="9" fill="#fff" stroke="#e5484d" stroke-width="2.4"/><text x="12" y="15.2" font-size="8.5" font-family="Arial Black,Arial" font-weight="900" text-anchor="middle" fill="#4a3b33">AD</text><path d="M5.6 5.6l12.8 12.8" stroke="#e5484d" stroke-width="2.4"/>`),
    house: S(`<path d="M3 11 12 4l9 7v9H3z" fill="#fff3df" ${OL}/><path d="M2 11.5 12 3.5l10 8" fill="none" stroke="#e86a5a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="6" fill="#8a5a3b"/>`),
    play: S(`<circle cx="12" cy="12" r="10" fill="#5ccf6e" ${OL}/><path d="M10 8l6 4-6 4z" fill="#fff"/>`),
    shop: S(`<path d="M5 8h14l-1 12H6z" fill="#ffd23f" ${OL}/><path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" ${OL}/>`),
    ad: S(`<rect x="2.5" y="5" width="19" height="14" rx="3" fill="#fff" ${OL}/><path d="M10 9l5 3-5 3z" fill="#5ccf6e" ${OL}/>`),
    check: S(`<circle cx="12" cy="12" r="10" fill="#5ccf6e"/><path d="M7 12.5l3.2 3L17 9" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`),
    lock: S(`<rect x="5" y="10" width="14" height="10" rx="2" fill="#c9c2b8" ${OL}/><path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" ${OL}/>`),
    star: S(`<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="#ffd23f" ${OL}/>`),
    close: S(`<path d="M6 6l12 12M18 6 6 18" stroke="#4a3b33" stroke-width="3" stroke-linecap="round"/>`),
    flower: S(`${petals('#ffb3c6')}<circle cx="12" cy="12" r="3.2" fill="#ffd84d" ${OL}/>`),
  };
  let css = '';
  for (const k in ICONS) css += `.ico-${k}{background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(ICONS[k])}")}\n`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  BS.Icons = ICONS;
})();
