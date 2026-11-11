import React, { useEffect, useRef, useState } from 'react';

/**
 * Help tab: the illustrated Myanmar user / admin guide (public/help/lms-guide.html)
 * shown inside the portal. The guide follows the portal's light/dark theme and
 * reports its height, so it reads as part of the page (no inner scrollbar).
 */
export const HelpGuidePage: React.FC<{ audience: 'user' | 'admin' }> = ({ audience }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1600);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const data = e.data as { type?: string; height?: number } | null;
      if (data?.type === 'lms-help-height' && typeof data.height === 'number' && data.height > 200) {
        setHeight(Math.ceil(data.height));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const src = audience === 'admin' ? '/help/lms-guide.html#admin' : '/help/lms-guide.html?lock=user#user';

  return (
    <iframe
      ref={ref}
      key={audience}
      src={src}
      title={audience === 'admin' ? 'Admin guide' : 'User guide'}
      className="block w-full border-0 bg-transparent"
      style={{ height }}
    />
  );
};
