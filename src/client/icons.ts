export function icon(kind:string){
  const paths:Record<string,string>={
    sword:'<path d="m15 6 4 3-8 15-3-2z" fill="#aebfb2"/><path d="m5 22 10 5M8 25l-3 6" stroke="#c3a879" stroke-width="3"/><path d="m16 9-6 13" stroke="#e3e7cd"/>',
    cleave:'<path d="m17 4 5 5-10 16-4-3z" fill="#b2c1b3"/><path d="m6 23 11 6M10 26l-4 6" stroke="#c0a36d" stroke-width="3"/><path d="M26 8q9 13-4 22" stroke="#e6a45e" stroke-width="2" fill="none"/>',
    sweep:'<path d="M4 22a13 13 0 1 1 25 0M7 24a10 10 0 0 0 20 0" stroke="#76cfc1" stroke-width="2" fill="none"/><path d="m17 6 4 3-8 15-3-2z" fill="#b2c1b3"/><path d="m7 22 8 5M10 26l-3 5" stroke="#c0a36d" stroke-width="3"/>',
    health:'<path d="M13 4h10v6l5 7v12q-10 7-20 0V17l5-7z" fill="#584b38" stroke="#b99f77"/><path d="M10 19h16v9q-8 5-16 0z" fill="#c15d49"/><path d="M15 11v6M13 21v5" stroke="#f5c4a0" stroke-width="2"/><path d="M12 4h12v4H12z" fill="#b09b6b"/>',
    mana:'<path d="M13 4h10v6l5 7v12q-10 7-20 0V17l5-7z" fill="#374b50" stroke="#b99f77"/><path d="M10 19h16v9q-8 5-16 0z" fill="#639daa"/><path d="M15 11v6M13 21v5" stroke="#b9e2db" stroke-width="2"/><path d="M12 4h12v4H12z" fill="#b09b6b"/>',
    chest:'<path d="m11 6 5 3h4l5-3 7 9-5 4-3-4v15H12V15l-3 4-5-4z" fill="#8e9b8c" stroke="#c1b691"/><path d="m12 14 6 4 6-4M18 10v17M12 27h12" stroke="#42554b" stroke-width="2"/>',
    boots:'<path d="M8 7h9l-2 16 4 4v4H6v-7zM21 7h9l-2 16 5 4v4H20v-7z" fill="#7c6c52" stroke="#baa27d"/><path d="M8 12h8M21 12h8M6 28h12M21 28h11" stroke="#c5b694"/>',
    crystal:'<path d="m19 3 8 10-3 15-7 6-8-12 3-14z" fill="#70b7ab" stroke="#a7e4d4"/><path d="m19 3-2 17 7 8M12 8l5 12-8 2M17 20v14l10-21z" stroke="#366b69" fill="#568f8c"/>',
    coins:'<ellipse cx="17" cy="26" rx="12" ry="5" fill="#ac8e4d" stroke="#d4ba78"/><ellipse cx="19" cy="20" rx="11" ry="5" fill="#ac8e4d" stroke="#d4ba78"/><ellipse cx="16" cy="14" rx="10" ry="5" fill="#c2a355" stroke="#e2c786"/><path d="m16 10 3 4-3 3-3-3z" fill="#857137"/>',
    bag:'<path d="M11 9q7 7 14 0l6 20q-13 8-26 0z" fill="#776447" stroke="#b6a17b"/><path d="M11 13h14M14 4h8l-1 7h-6z" stroke="#c7b895" fill="none"/>',
    character:'<path d="M12 11a6 6 0 1 1 12 0q0 7-6 7t-6-7M8 31v-8q10-9 20 0v8z" fill="#849788" stroke="#c2b793"/>',
    map:'<path d="m5 8 8-3 10 4 9-4v23l-9 4-10-4-8 4z" fill="#7e8064" stroke="#c2b793"/><path d="M13 5v23M23 9v23M8 18l9-4 10 9" stroke="#bfb289" fill="none"/>'
  };
  return `<svg viewBox="0 0 36 36" aria-hidden="true">${paths[kind]??paths.crystal}</svg>`;
}
export function esc(input:unknown){return String(input??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
