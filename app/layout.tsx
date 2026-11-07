import './globals.css';
export const metadata = { title: 'Дорогой Никто — письмо незнакомцу', description: 'Оставьте немного себя. Найдите немного другого. Анонимный обмен письмами.' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="ru"><body>{children}</body></html>; }
