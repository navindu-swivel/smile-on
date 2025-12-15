import Chatbot from '@/components/Chatbot';

export default function Home() {
  return (
    <main className="h-screen w-full relative">
      <iframe 
        src="https://www.smileon.com.au/" 
        className="w-full h-full border-none"
        title="Smile On Website"
      />
      <Chatbot />
    </main>
  );
}