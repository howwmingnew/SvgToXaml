import { useCallback } from 'react';
import { useAppDispatch } from '../store/AppContext';

export function useClipboard() {
  const dispatch = useAppDispatch();

  const copyToClipboard = useCallback(async (text: string, message = '已複製到剪貼簿') => {
    try {
      await navigator.clipboard.writeText(text);
      dispatch({ type: 'SHOW_TOAST', payload: message });
      setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      dispatch({ type: 'SHOW_TOAST', payload: message });
      setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 2500);
    }
  }, [dispatch]);

  return { copyToClipboard };
}
