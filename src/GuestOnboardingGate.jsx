import React, { useState } from 'react';

import { useGuestUiLocale } from './GuestUiLocaleContext.jsx';

import { useNomihodaiSession } from './NomihodaiSessionContext.jsx';

import PartyOnboardingVisual from './PartyOnboardingVisual.jsx';



/**

 * 客席：言語（日本／外国）＋人数を常に1画面で表示。

 * 他機能の変更でこのゲートをスキップしないよう、完了判定は App の needsGuestOnboarding のみ。

 */

export default function GuestOnboardingGate() {

  const { t: ut, locale, setLocale } = useGuestUiLocale();

  const { session, submitGuestPartyDemographics } = useNomihodaiSession();

  const [localeChoice, setLocaleChoice] = useState(locale === 'en' ? 'en' : 'ja');

  const [men, setMen] = useState(0);

  const [women, setWomen] = useState(0);

  const [children, setChildren] = useState(0);

  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState('');



  const total = men + women + children;



  const pickLocale = (next) => {

    const v = next === 'en' ? 'en' : 'ja';

    setLocaleChoice(v);

    setLocale(v);

    setErr('');

  };



  const onChangeCount = (key, value) => {

    if (key === 'men') setMen(value);

    else if (key === 'women') setWomen(value);

    else setChildren(value);

    setErr('');

  };



  const onSubmitParty = async () => {

    if (total < 1) {

      setErr(ut('party_gate_need_short'));

      return;

    }

    setErr('');

    setBusy(true);

    try {

      const res = await submitGuestPartyDemographics({

        men,

        women,

        children,

        locale: localeChoice,

      });

      if (!res?.ok) setErr(ut('party_gate_fail_short'));

    } finally {

      setBusy(false);

    }

  };



  const labels = {

    table: ut('party_gate_table_short'),

    localeTitle: ut('onboarding_locale_title'),

    partyTitle: ut('party_gate_title'),

    ja: ut('onboarding_locale_ja_short'),

    en: ut('onboarding_locale_en_short'),

    jaSub: ut('onboarding_locale_ja_sub'),

    enSub: ut('onboarding_locale_en_sub'),

    jaAria: ut('onboarding_locale_ja_aria'),

    enAria: ut('onboarding_locale_en_aria'),

    men: ut('party_gate_men'),

    women: ut('party_gate_women'),

    children: ut('party_gate_children'),

    start: ut('party_gate_submit_short'),

    wait: '…',

    needOne: ut('party_gate_need_short'),

    ariaLocale: ut('onboarding_locale_title'),

    ariaParty: ut('party_gate_title'),

  };



  return (

    <PartyOnboardingVisual

      layout="combined"

      table={session.tableLabel}

      localeSelected={localeChoice}

      onPickLocale={pickLocale}

      counts={{ men, women, children }}

      onChangeCount={onChangeCount}

      onSubmit={onSubmitParty}

      busy={busy}

      errorMessage={err}

      labels={labels}

    />

  );

}

