import { useAppState } from '../store/AppContext';

export function Toast() {
  const { toast } = useAppState();
  if (!toast.visible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 toast-animate">
      <div className="bg-[#EE1E1E1E] text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm border border-[#3F3F46]">
        {toast.message}
      </div>
    </div>
  );
}
