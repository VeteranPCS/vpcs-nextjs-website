export default function ResourceIcon({name,solid=false}:{name:string;solid?:boolean}) {
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
 const pictograms:Record<string,React.ReactNode>={
 home:<><path fill="currentColor" stroke="none" fillRule="evenodd" d="M1 11 12 1l11 10-2 2-2-2v12h-5v-8h-4v8H5V11l-2 2Zm3-1 8-7 8 7-1 1-7-6-7 6Z"/></>,
 box:<><path fill="currentColor" stroke="none" d="m3 8 8 3v11l-8-3Zm10 3 8-3v11l-8 3ZM4 6l8-4 8 4-8 3Z"/></>,
 dollar:<><circle cx="12" cy="12" r="11" fill="currentColor" stroke="none"/><path d="M16 7h-6a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H8M12 4v16" stroke="white" strokeWidth="2"/></>,
 pin:<><path fill="currentColor" stroke="none" fillRule="evenodd" d="M12 1a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></>,
 tag:<><path fill="currentColor" stroke="none" fillRule="evenodd" d="m2 13 11-11h9v9L11 22Zm15-9a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></>,
 calculator:<><rect x="4" y="1" width="16" height="22" rx="2" fill="currentColor" stroke="none"/><path fill="white" stroke="none" d="M7 4h10v4H7Zm0 7h2v2H7Zm4 0h2v2h-2Zm4 0h2v2h-2Zm-8 4h2v2H7Zm4 0h2v2h-2Zm4 0h2v2h-2Zm-8 4h2v2H7Zm4 0h2v2h-2Zm4 0h2v2h-2Z"/></>,
 checklist:<><path fill="currentColor" stroke="none" d="M4 3h3v4h10V3h3v19H4ZM9 1h6v4H9Z"/><path stroke="white" strokeWidth="1.5" d="m7 11 1 1 2-3m-3 8 1 1 2-3m3-5h4m-4 6h4"/></>,
 users:<><circle cx="8" cy="6" r="4" fill="currentColor" stroke="none"/><circle cx="18" cy="7" r="3" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="M1 22v-6c0-5 14-5 14 0v6Zm16-9c4 0 6 2 6 5v4h-6Z"/></>,
 };
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-resource-icon={name}>{(solid && pictograms[name]) || paths[name] || paths.home}</svg>;
}
