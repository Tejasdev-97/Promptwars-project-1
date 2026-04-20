import { useState } from 'react';
import { chatWithAssistant } from '../services/geminiService';

export const useGemini = (userContext: any) => {
   const [messages, setMessages] = useState<{sender: 'user' | 'bot', text: string}[]>([]);
   const [loading, setLoading] = useState(false);

   const sendMessage = async (userMessage: string) => {
      if (!userMessage.trim()) return;
      
      setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
      setLoading(true);

      try {
         const response = await chatWithAssistant(userMessage, userContext);
         setMessages(prev => [...prev, { sender: 'bot', text: response }]);
      } catch (error) {
         setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I encountered an error connecting to my servers.' }]);
      } finally {
         setLoading(false);
      }
   };

   return { messages, sendMessage, loading, setMessages };
};
