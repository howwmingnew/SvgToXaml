import { useAppState, useAppDispatch } from '../store/AppContext';
import { useRef, useEffect, useCallback } from 'react';

export function SearchBar() {
  const { searchQuery } = useAppState();
  const dispatch = useAppDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
    }, 300);
  }, [dispatch]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <input
      type="text"
      placeholder="搜尋圖示..."
      defaultValue={searchQuery}
      onChange={handleChange}
      className="bg-[#3C3C3C] text-[#CCCCCC] px-3 py-1 rounded text-sm border border-[#555555] focus:border-[#007ACC] focus:outline-none w-48 placeholder-[#808080]"
    />
  );
}
