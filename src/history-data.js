/*
 * HLB history book: user-supplied chronology checked against public official sources.
 * Dates and image provenance: docs/history-sources.md.
 * Images are related reference material, not photographs of the historical events.
 */
(() => {
  'use strict';

  const sourceUrl = 'https://hlbbio.co.kr/about/company/#history_top';
  const timeline = { title: 'HLB 공식 회사 연혁', url: sourceUrl };
  const ir2026 = {
    title: 'HLB 2026년 6월 IR 자료 — CARES-310 개발 경과',
    url: 'https://kind.krx.co.kr/external/dst/irReference/18692/%5BHLB%5D%2026%EB%85%84%206%EC%9B%94%20IR%20%EC%9E%90%EB%A3%8C%20%28%EA%B5%AD%EB%AC%B8%29.pdf',
  };
  const fda2026 = {
    title: 'FDA — 리라푸그라티닙 승인 발표, 2026.09.23',
    url: 'https://www.fda.gov/drugs/cancer-approvals/fda-approves-lirafugratinib-previously-treated-unresectable-locally-advanced-or-metastatic',
  };
  const photos = {
    lifeboat: {
      url: 'assets/history/images/lifeboat.jpg',
      alt: '진수장치에 장착된 주황색 자유낙하식 구명정',
      caption: 'HLB이엔지 구명정 관련 자료사진. 해당 연도의 현장 사진은 아닙니다.',
      sourceUrl: 'https://hlb-eng.com/shipbuilding-business',
    },
    facility: {
      url: 'assets/history/images/hlb-ulsan-facility.jpg',
      alt: 'HLB이엔지 공식 소개에 실린 울산 제조시설 전경',
      caption: 'HLB이엔지 제조시설 관련 자료사진. 해당 연도의 시설 모습과 다를 수 있습니다.',
      sourceUrl: 'https://hlb-eng.com/about',
    },
    yacht: {
      url: 'assets/history/images/yacht.jpg',
      alt: '현대요트 공식 소개에 실린 해상 운항 중인 흰색 요트',
      caption: '현대요트의 요트 사업 관련 자료사진. 2006년 개발한 31ft 모델의 사진은 아닙니다.',
      sourceUrl: 'http://www.hdyachts.com/',
    },
    pipes: {
      url: 'assets/history/images/grp-pipes.jpg',
      alt: 'HLB이엔지 GRP 파이프 제품',
      caption: 'HLB이엔지 GRP 파이프 관련 자료사진. 해당 연도의 생산 현장 사진은 아닙니다.',
      sourceUrl: 'https://hlb-eng.com/material-business',
    },
    research: {
      url: 'assets/history/images/elevar-research.jpg',
      alt: '보안경을 착용하고 실험기구를 살펴보는 연구자 이미지',
      caption: 'Elevar 공식 홈페이지의 연구 관련 자료이미지. 특정 임상시험의 현장 사진은 아닙니다.',
      sourceUrl: 'https://elevartx.com/',
    },
    care: {
      url: 'assets/history/images/elevar-care.jpg',
      alt: 'Elevar 공식 홈페이지의 사람과 일상을 표현한 이미지',
      caption: 'Elevar 공식 홈페이지의 관련 자료이미지. 특정 환자나 치료 결과를 나타내지 않습니다.',
      sourceUrl: 'https://elevartx.com/',
    },
    immunomic: {
      url: 'assets/history/images/immunomic-unite.jpg',
      alt: 'Immunomic UNITE 소개 영상의 세포 그래픽',
      caption: 'Immunomic의 UNITE 플랫폼 소개 그래픽. 실제 세포 촬영 사진은 아닙니다.',
      sourceUrl: 'https://www.immunomix.com/',
    },
    verismo: {
      url: 'assets/history/images/verismo-platform.jpg',
      alt: 'Verismo 공식 홈페이지의 세포치료 연구 브랜드 그래픽',
      caption: 'Verismo 공식 홈페이지의 관련 브랜드 그래픽. 인수 당시 행사 사진은 아닙니다.',
      sourceUrl: 'https://www.verismotherapeutics.com/',
    },
    signature: {
      url: 'assets/history/images/hlb-signature.png',
      alt: 'HLB의 마그마 레드와 흰색·회색 브랜드 로고 조합',
      caption: 'HLB 공식 CI 페이지의 브랜드 이미지. 2026년 확인 자료입니다.',
      sourceUrl: 'https://hlbbio.co.kr/about/ci/',
    },
  };
  const event = (text, month) => month ? { month, text } : { text };
  const chapter = (year, title, intro, events, photo, sources = []) => ({
    id: `hlb-history-${year}`, year, title, intro, events,
    photo: { ...photos[photo] },
    sources: [timeline, ...sources],
  });

  globalThis.HLBHistoryData = {
    title: 'History of HLB',
    sourceUrl,
    checkedAt: '2026-11-10',
    chapters: [
      chapter(2000, '바다에서 시작한 여정',
        '현대정공에서 분사한 현대라이프보트가 설립되었습니다. 구명정을 만드는 해양사업의 출발점을 돌아보는 장입니다.', [
          event('경일요트를 전신으로 한 현대라이프보트 설립 및 현대정공에서 분사'),
        ], 'lifeboat'),
      chapter(2004, '수출로 넓어진 무대',
        '현대라이프보트가 500만 불 수출의 탑을 수상했습니다. 해양사업의 해외 진출을 보여 주는 기록입니다.', [
          event('현대라이프보트, 500만 불 수출의 탑 수상'),
        ], 'facility'),
      chapter(2006, '요트 개발로 펼친 가능성',
        '31ft 세일 요트를 개발하고 생산했습니다. 구명정에서 이어 온 선박 기술이 요트 개발로 확장되었습니다.', [
          event('31ft 세일 요트 개발 및 생산'),
        ], 'yacht'),
      chapter(2007, '새 이름과 해외 거점',
        '국제정공이 라이프코드인터내셔날로 이름을 바꾸고 미국 현지법인을 설립했습니다. 회사의 이름과 해외 조직에 변화가 생긴 해였습니다.', [
          event('국제정공에서 라이프코드인터내셔날로 사명 변경'),
          event('미국 현지법인 Lifecord International USA 설립'),
        ], 'facility'),
      chapter(2008, '소재와 요트로 넓힌 사업',
        '현대라이프보트에 GRP 파이프 사업이 더해지고, 요트사업은 현대요트로 분사했습니다. 선박과 소재라는 여러 사업 축이 함께 자리 잡았습니다.', [
          event('라이프코드인터내셔날에서 이노GDN으로 사명 변경'),
          event('현대라이프보트 GRP 파이프 사업부문 창설'),
          event('현대라이프보트 요트사업부 분사 및 현대요트 설립'),
        ], 'pipes'),
      chapter(2009, 'HLB라는 이름으로',
        '이노GDN이 HLB로 사명을 변경했습니다. 수출의 탑 수상과 사업 거점 설립이 이어지며 새로운 이름 아래 사업 기반을 다졌습니다.', [
          event('이노GDN에서 에이치엘비(HLB)로 사명 변경'),
          event('현대라이프보트, 1,000만 불 수출의 탑 수상'),
          event('현대라이프보트 구명정 신사옥 준공'),
          event('HLB Networks 및 Hyundai Lifeboats Singapore 설립'),
        ], 'facility'),
      chapter(2010, '구명정 기술의 인정',
        '구명정이 지식경제부의 세계일류상품으로 선정되었습니다. HLB의 초기 성장을 이끈 해양 기술을 보여 주는 이정표입니다.', [
          event('지식경제부, 구명정을 세계일류상품으로 선정'),
        ], 'lifeboat'),
      chapter(2011, '2,000만 불 수출의 기록',
        '현대라이프보트가 2,000만 불 수출의 탑을 받았습니다. 2004년과 2009년에 이어 수출 성과를 기록했습니다.', [
          event('현대라이프보트, 2,000만 불 수출의 탑 수상'),
        ], 'facility'),
      chapter(2013, '하나로 모은 해양사업',
        'HLB가 자회사 현대라이프보트를 합병했습니다. 회사와 해양사업의 발자취가 하나의 연혁으로 이어진 시점입니다.', [
          event('자회사 현대라이프보트 합병'),
        ], 'lifeboat'),
      chapter(2015, '바이오로 이어지는 변화',
        'LSK Biopharma의 자회사 편입과 제조사업 재편이 함께 진행되었습니다. 바이오와 기존 사업의 변화가 나란히 기록된 해입니다.', [
          event('LSK Biopharma 자회사 편입'),
          event('전기·계장사업부문 분할 및 HLB일렉 설립'),
          event('GRP·GRE 파이프 제2공장 준공'),
        ], 'pipes'),
      chapter(2017, '생산과 임상의 이정표',
        '구명정·특수선 누적 생산 7,000대와 위암 글로벌 임상 3상 개시가 함께 기록되었습니다. 해양사업의 축적과 신약개발의 진전을 한눈에 볼 수 있습니다.', [
          event('현대라이프보트 구명정·특수선 7,000대 생산 달성'),
          event('Elevar, 글로벌 위암 임상 3상 개시'),
          event('리보세라닙, 위암 3차 치료 관련 미국·유럽 희귀의약품 지정'),
          event('리보세라닙과 BMS 면역항암제 옵디보의 병용임상 시작'),
        ], 'research'),
      chapter(2018, '헬스케어와 병용임상',
        '화진메디칼을 인수하고 간암 1차 병용임상을 시작했습니다. 의료기기와 항암제 개발이라는 두 방향에서 사업을 이어 갔습니다.', [
          event('화진메디칼 인수'),
          event('Elevar, 항서제약의 캄렐리주맙과 간암 1차 병용임상 시작'),
        ], 'care'),
      chapter(2019, '연결된 글로벌 개발 체계',
        'HLB·Elevar·HLB USA의 삼각합병과 위암 임상 3상 종료가 기록되었습니다. 같은 해 해양사업에서는 새로운 전폐형 구명정 모델을 양산했습니다.', [
          event('HLB·Elevar·HLB USA 삼각합병'),
          event('현대라이프보트, 36인승 전폐형 구명정 HLB65T/F 양산'),
          event('Elevar, 글로벌 위암 임상 3상 종료'),
          event('위암 임상 3상 결과, Best of ESMO 선정'),
        ], 'lifeboat'),
      chapter(2020, '면역치료와 글로벌 권리',
        'Immunomic Therapeutics 인수와 리보세라닙 글로벌 권리 인수가 이루어졌습니다. Elevar의 항암제 권리 확보도 함께 진행되었습니다.', [
          event('Immunomic Therapeutics 인수'),
          event('Advenchen으로부터 리보세라닙 글로벌 권리 인수'),
          event('Elevar, 항암제 Apealea 글로벌 권리 인수'),
          event('Immunomic 서울사무소 개설'),
        ], 'immunomic'),
      chapter(2021, '세포치료 연구로 확장',
        'HLB와 HLB제약이 Verismo Therapeutics를 인수했습니다. 그룹의 신약개발 여정에 세포치료 연구의 축이 더해졌습니다.', [
          event('HLB·HLB제약, Verismo Therapeutics 인수'),
        ], 'verismo'),
      chapter(2022, '바이오기업으로의 전환',
        'HLB가 바이오기업으로 업종을 변경했습니다. 간암 임상 결과 발표, DNA 백신 임상, 헬스케어사업 재편과 지속가능경영 참여가 이어졌습니다.', [
          event('Elevar, 간암 1차 병용요법 글로벌 임상 3상 결과를 ESMO 2022에서 발표', 9),
          event('HLB, 바이오기업으로 업종 변경'),
          event('Immunomic, ITI-3000의 메르켈세포암 임상 1상 착수'),
          event('Immunomic, ITI-1001의 교모세포종 임상 1상 착수'),
          event('FA 흡수합병 및 HLB 헬스케어사업부로 재편'),
          event('노터스 인수'),
          event('Verismo, 베리스모 아시아 설립'),
          event('지속가능경영을 위한 UNGC 글로벌 이니셔티브 가입'),
        ], 'immunomic', [ir2026]),
      chapter(2023, '계열사 재편과 허가 심사',
        'HLB이노베이션과 HLB파나진으로 이어지는 계열사 재편이 이루어졌습니다. Elevar의 간암 1차 병용요법은 미국 허가 심사 단계에 진입했습니다.', [
          event('HLB컨소시엄, PSMC 인수 및 HLB이노베이션으로 재편'),
          event('HLB컨소시엄, 파나진 인수 및 HLB파나진으로 재편'),
          event('Elevar, 간암 1차 병용요법 신약허가신청(NDA) 및 FDA 본심사 진입'),
        ], 'research'),
      chapter(2024, '연구 영역과 글로벌 거점',
        '보스턴 사무소 설립과 뉴로토브·제노포커스 인수로 연구 및 사업 기반을 넓혔습니다. 간암 신약개발과 헬스케어 브랜드의 전개도 이어졌습니다.', [
          event('보스턴에 HLB US 사무소 설립', 4),
          event('간암 병용요법 임상에서 전체생존기간 중앙값(mOS) 23.8개월 발표', 5),
          event('여성 전문 케어 브랜드 이너생각 론칭', 8),
          event('간암 신약, 유럽연합 집행위원회 희귀의약품 지정', 8),
          event('FDA에 간암 신약 재심사 신청', 9),
          event('뇌질환 신약개발 기업 뉴로토브 인수', 9),
          event('효소 생산기업 제노포커스(현 HLB제넥스) 인수', 10),
        ], 'research'),
      chapter(2025, '연구 기반을 넓히고 도전을 잇다',
        '펩타이드 분야 인수와 HLB사이언스 합병, 오픈이노베이션 프로젝트가 이어졌습니다. 간암 개발 성과의 학술 발표와 허가 절차의 과제가 함께 기록되었습니다.', [
          event('미세 채혈도구 랜싯, FDA 판매 승인', 1),
          event('간암 병용요법, ESMO 치료 가이드라인 등재', 2),
          event('간암 신약 관련 FDA 2차 보완요구서(CRL) 수령', 3),
          event('펩타이드 전문기업 애니젠(현 HLB펩) 인수', 3),
          event('오픈이노베이션 프로젝트 2025 HLB NEW WAVE 출범', 9),
          event('간암 병용요법, BCLC 가이드라인 등재', 11),
          event('LMR파트너스, HLB그룹에 1억 4,500만 달러 투자', 11),
          event('김태한 전 삼성바이오로직스 대표이사 영입', 12),
          event('HLB와 HLB사이언스 합병 완료', 12),
          event('HLB그룹, 학동 사옥 이전', 12),
          event('간암 임상 3상 최종 분석 결과, The Lancet Oncology 게재'),
        ], 'care', [{
          title: 'Elevar — CARES-310 최종 분석 논문 발표',
          url: 'https://elevartx.com/2025/12/03/elevar-therapeutics-cares-310-lancet/',
        }]),
      chapter(2026, 'FDA 승인과 이어지는 여정',
        '담관암 치료제 리픽투(LYRFIGTU)가 9월 23일 미국 FDA 승인을 받았습니다. 간암 개발 프로그램과 구분되는 성과로, 유럽 허가 신청과 연구개발이 이어졌습니다.', [
          event('담관암 신약의 FDA 신약허가신청(NDA)', 1),
          event('간암 신약 FDA 재신청', 1),
          event('ASCO GI에서 담관암 신약 임상 1/2상 결과 발표', 1),
          event('담관암 신약, FDA 우선심사 대상 지정', 3),
          event('통합 IR Day 및 주주간담회 개최', 4),
          event('ASCO 2026에서 간암·담관암 개발 성과 공개', 5),
          event('2026 HLB 포럼 개최', 5),
          event('FGFR2 융합·재배열 암종불문 임상 2상 첫 환자 투약', 6),
          event('간암 신약 관련 FDA 3차 보완요구서(CRL) 수령', 7),
          event('Immunomic, 삼중음성유방암 ITI-5000·알레르기 ITI-9001 백신 첫 환자 투약', 7),
          event('그룹 GI 변경', 8),
          event('담관암 치료제 리픽투(LYRFIGTU·리라푸그라티닙), 미국 FDA 승인', 9),
          event('담관암 신약, 유럽의약품청(EMA) 품목허가 신청', 9),
        ], 'signature', [fda2026, {
          title: 'Elevar — LYRFIGTU FDA 승인 발표',
          url: 'https://elevartx.com/2026/09/23/elevar-fda-approval-lyrfigtu-2/',
        }]),
    ],
  };
})();
