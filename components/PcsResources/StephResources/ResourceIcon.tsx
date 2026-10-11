export default function ResourceIcon({name}:{name:string}) {
 const paths:Record<string,React.ReactNode>={
 home:<><path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7"/></>,
 box:<><path d="m3 6 9-4 9 4v13l-9 3-9-3ZM3 6l9 4 9-4M12 10v12M7 4l10 4"/></>,
 dollar:<><circle cx="12" cy="12" r="10"/><path d="M16 7h-6a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8M12 4v18"/></>,
 shield:<><path d="M12 2 3 6v7c0 5 9 9 9 9s9-4 9-9V6ZM8 12l3 3 5-6"/></>,
 map:<><path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3ZM8 2v17M16 5v17"/></>,
 pin:<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
 gift:<><path d="M3 10h18v4H3ZM5 14v8h14v-8M12 10v12"/><path d="M12 10S3 9 5 4s7 6 7 6 5-11 7-6-7 6-7 6"/></>,
 checklist:<><path d="M8 3H4v19h16V3h-4M8 2h8v4H8ZM7 11l1 1 2-3M12 11h5M7 17l1 1 2-3M12 17h5"/></>,
 users:<><circle cx="8" cy="6" r="4"/><circle cx="18" cy="7" r="3"/><path d="M1 22v-6c0-5 14-5 14 0v6M16 12c5 0 7 2 7 5v5"/></>,
 calculator:<><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 5h8v4H8ZM8 13h1M12 13h1M16 13h1M8 17h1M12 17h1M16 17h1"/></>,
 tag:<><path d="m2 13 11-11h9v9L11 22Z"/><circle cx="17" cy="7" r="1"/></>,
 };
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.home}</svg>;
}
