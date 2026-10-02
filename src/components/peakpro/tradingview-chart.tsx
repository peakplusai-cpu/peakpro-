'use client';

import { useEffect, useRef } from 'react';

import type { Locale } from '@/i18n/locale';

export function PeakProTradingViewChart({
  symbol,
  locale,
  timezone,
}: {
  symbol: string;
  locale: Locale;
  timezone: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !symbol) return;
    host.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container h-full w-full';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget h-full w-full';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone,
      theme: 'dark',
      style: '1',
      locale: locale === 'zh' ? 'zh_TW' : 'en',
      backgroundColor: '#000000',
      gridColor: 'rgba(212, 175, 55, 0.08)',
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });
    wrap.append(widget, script);
    host.append(wrap);

    return () => {
      host.innerHTML = '';
    };
  }, [symbol, locale, timezone]);

  return <div ref={hostRef} className="h-[520px] w-full min-h-[520px]" />;
}
