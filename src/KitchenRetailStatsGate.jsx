import React, { useState } from 'react';
import PartyOnboardingVisual from './PartyOnboardingVisual.jsx';

/** 厨房テイクアウト：言語・人数（客席と同じビジュアルUI） */
export default function KitchenRetailStatsGate({ onConfirm }) {
  const [step, setStep] = useState('locale');
  const [locale, setLocale] = useState('ja');
  const [men, setMen] = useState(0);
  const [women, setWomen] = useState(0);
  const [children, setChildren] = useState(0);
  const [err, setErr] = useState('');

  const total = men + women + children;

  const onChangeCount = (key, value) => {
    if (key === 'men') setMen(value);
    else if (key === 'women') setWomen(value);
    else setChildren(value);
    setErr('');
  };

  const finish = () => {
    if (total < 1) {
      setErr('1名以上');
      return;
    }
    onConfirm({
      locale: locale === 'en' ? 'en' : 'ja',
      men,
      women,
      children,
    });
  };

  return (
    <PartyOnboardingVisual
      layout="steps"
      step={step}
      stepIndex={step === 'locale' ? 1 : 2}
      stepTotal={2}
      localeSelected={locale === 'en' ? 'en' : 'ja'}
      onBack={step === 'party' ? () => setStep('locale') : undefined}
      onPickLocale={(v) => {
        setLocale(v);
        setStep('party');
        setErr('');
      }}
      counts={{ men, women, children }}
      onChangeCount={onChangeCount}
      onSubmit={finish}
      errorMessage={err}
      labels={{
        ja: '日本',
        en: '外国',
        men: '男性',
        women: '女性',
        children: '子供',
        start: 'OK',
        needOne: '1名以上',
        back: '戻る',
      }}
    />
  );
}
