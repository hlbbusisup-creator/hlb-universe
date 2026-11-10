# HLB 역사관 데이터와 이미지 출처

확인일: 2026-11-10. 화면 데이터는 `src/history-data.js`의 `globalThis.HLBHistoryData`에 있습니다.

## 수록 기준

- 사용자가 제공한 2000~2026년 연혁을 바탕으로 HLB 공식 회사 연혁과 대조했습니다.
- 기록이 있는 20개 연도만 한 장씩 구성했습니다. 2001~2003·2005·2012·2014·2016년은 임의로 사건을 만들지 않았습니다.
- 장은 연도 오름차순이며, 월이 주어진 사건은 해당 월을 숫자로 저장했습니다. 연도만 확인되는 사건에는 `month`를 넣지 않았습니다.
- 사용자가 제공한 범위 밖의 후속 사건은 추가하지 않았습니다. 따라서 확인일 현재 회사의 모든 최신 사건을 망라한 연혁은 아닙니다.
- 2000년은 현대라이프보트 설립 기록입니다. HLB 상장법인 전체의 법적 설립연도를 2000년으로 표현하지 않았습니다.
- 본문은 사실을 간결하게 재서술했습니다. 임상 성과를 환자 개인의 효능이나 의약품 사용 권고로 표현하지 않았습니다.

주된 출처: [HLB 공식 회사 연혁](https://hlbbio.co.kr/about/company/#history_top). 공개 페이지의 일반 HTTP 요청으로 원문을 확인했습니다.

## 교차 확인과 편집 사항

### 2022년 ESMO 표기

사용자 자료와 HLB 홈페이지의 2022년 항목에는 ‘ESMO 2023’이라고 적혀 있습니다. [HLB 2026년 6월 IR 자료](https://kind.krx.co.kr/external/dst/irReference/18692/%5BHLB%5D%2026%EB%85%84%206%EC%9B%94%20IR%20%EC%9E%90%EB%A3%8C%20%28%EA%B5%AD%EB%AC%B8%29.pdf)의 CARES-310 개발 경과에는 **2022년 9월 ESMO 결과 발표**가 명시되어 있습니다. 책에서는 ‘ESMO 2022’와 9월로 정리했습니다.

### 2025년 The Lancet Oncology 게재

HLB 홈페이지는 11월, HLB IR 자료는 12월로 기록합니다. [Elevar 공식 보도자료](https://elevartx.com/2025/12/03/elevar-therapeutics-cares-310-lancet/)는 2025-12-03이며, [논문 서지정보](https://pubmed.ncbi.nlm.nih.gov/41308676/)는 2025년 12월호를 표시합니다. 온라인 게재와 발표·발행 시점을 하나로 단정하지 않도록 책에서는 월 없이 2025년의 사건으로 수록했습니다. 사건 자체는 유지했습니다.

### 2026년 FDA 승인과 다른 개발 프로그램의 구분

[FDA 공식 승인 발표](https://www.fda.gov/drugs/cancer-approvals/fda-approves-lirafugratinib-previously-treated-unresectable-locally-advanced-or-metastatic)와 [Elevar 공식 발표](https://elevartx.com/2026/09/23/elevar-fda-approval-lyrfigtu-2/)에서 **2026-09-23 Lyrfigtu(리라푸그라티닙) 승인**을 확인했습니다. FDA가 명시한 대상은 이전 치료를 받은, FGFR2 융합 또는 재배열이 있는 절제 불가 국소 진행성·전이성 담관암 성인 환자입니다.

이 승인을 간암 병용요법 승인으로 표현하지 않았습니다. 사용자 연혁의 간암 FDA CRL 수령 기록도 별도로 유지했습니다. ‘우선심사 지정’과 ‘품목허가 신청’ 역시 승인과 구분해 적었습니다.

### 기타 문구 정리

- 2015년의 ‘Elevar, LSK Biopharma 자회사 편입’은 관계를 오해할 수 있는 중복 주어를 빼고 ‘LSK Biopharma 자회사 편입’으로 정리했습니다.
- 2018년 간암 병용임상 시작을 임의로 ‘글로벌 3상 개시’라고 바꾸지 않았습니다.
- ‘국내 1위’, ‘세계 최대’와 같이 이 연혁 전달에 필수적이지 않은 비교 표현은 생략했습니다.

## 이미지 출처와 사용 맥락

9개 이미지 원본은 아래 공식 공개 페이지에서 확인해 로컬에 저장했습니다. 이미지를 합성하거나 당시 현장 사진으로 재구성하지 않았습니다. `photo.sourceUrl`은 이미지가 실린 공식 페이지이며, 각 장의 캡션은 자료사진·그래픽의 성격을 설명합니다. 특정 연도의 행사 사진, 특정 임상시험의 사진, 환자의 치료 전후 사진으로 설명하지 않습니다. 같은 관련 이미지를 여러 장에서 재사용할 수 있습니다.

| 로컬 파일 | 공식 페이지 | 원본 파일 | 책에서의 맥락 |
| --- | --- | --- | --- |
| `assets/history/images/lifeboat.jpg` | [HLB이엔지 선박 사업](https://hlb-eng.com/shipbuilding-business) | [자유낙하식 구명정](https://cdn.prod.website-files.com/64155b4d21beab0c31b77a12/643331929d91c6f1d9d6ca95_img_freefallLifeBoat03.jpg) | 구명정 사업 관련 자료사진. 2019년 HLB65T/F의 사진이라고 명명하지 않음. |
| `assets/history/images/hlb-ulsan-facility.jpg` | [HLB이엔지 회사 소개](https://hlb-eng.com/about) | [울산 제조시설](https://cdn.prod.website-files.com/64155b4d21beab0c31b77a12/642de814e950923034efe1e1_%E1%84%8B%E1%85%AE%E1%86%AF%E1%84%89%E1%85%A1%E1%86%AB%202%E1%84%80%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A1%E1%86%BC-2.jpg) | 제조시설 관련 자료사진. 과거 사옥이나 수출의 탑 수상식 사진으로 설명하지 않음. |
| `assets/history/images/yacht.jpg` | [현대요트](http://www.hdyachts.com/) | [요트 사업 소개 이미지](http://www.hdyachts.com/main/common/images/main/img_ourService01_pc.jpg) | 요트 사업 관련 자료사진. 2006년의 31ft 세일 요트와 다른 모델임을 명시. |
| `assets/history/images/grp-pipes.jpg` | [HLB이엔지 소재 사업](https://hlb-eng.com/material-business) | [GRP 파이프](https://cdn.prod.website-files.com/64155b4d21beab0c31b77a12/642dcced9146057832bee343_GRP%20Pipe.jpg) | 소재 사업과 공장 준공 연혁의 관련 제품사진. |
| `assets/history/images/elevar-research.jpg` | [Elevar Therapeutics](https://elevartx.com/) | [연구 관련 이미지](https://elevartx.com/wp-content/themes/conall-child/images/hp_tri_section_img2-650x482.jpg) | 바이오 연구 관련 자료이미지. 사진 속 인물을 특정 연구자 또는 임상 참여자로 식별하지 않음. |
| `assets/history/images/elevar-care.jpg` | [Elevar Therapeutics](https://elevartx.com/) | [사람과 일상 관련 이미지](https://elevartx.com/wp-content/themes/conall-child/images/hp_tri_section_img1-650x482.jpg) | 헬스케어 관련 자료이미지. 특정 환자나 치료 결과를 나타내지 않음. |
| `assets/history/images/immunomic-unite.jpg` | [Immunomic Therapeutics](https://www.immunomix.com/) | [UNITE 소개 영상 이미지](https://www.immunomix.com/wp-content/uploads/2021/07/unite-video.jpg) | 면역치료 연구를 설명하는 공식 그래픽. 실제 세포 사진으로 표현하지 않음. |
| `assets/history/images/verismo-platform.jpg` | [Verismo Therapeutics](https://www.verismotherapeutics.com/) | [공식 홈페이지 배너](https://verismotherapeutics.com/wp-content/uploads/2022/09/banner-verismo-scaled.jpg) | 세포치료 연구 관련 브랜드 그래픽. 2021년 인수 당시 사진으로 표현하지 않음. |
| `assets/history/images/hlb-signature.png` | [HLB CI](https://hlbbio.co.kr/about/ci/) | [브랜드 로고 조합](https://hlbbio.co.kr/include/images/sub/about/ci_logo2.png) | 2026년 장의 그룹 GI 관련 공식 이미지. |

이미지 권리는 각 원권리자에게 있으며 출처 표시는 권리의 이전이나 별도 라이선스 부여를 뜻하지 않습니다. 사용자 회사의 온라인 체험관이라는 용도에 맞춰 관련 공식 자료만 사용했습니다.

HLB 보도자료 일부에는 사진 주소가 게시자 PC의 `file://` 경로로 남아 있었습니다. 이런 비공개 로컬 경로에는 접근하지 않았으며, 해당 이미지를 책에 포함하지 않았습니다.

## 점검

데이터의 20개 장과 75개 사건, 오름차순 연도, 중복 없는 ID, 월 범위, 로컬 이미지 파일 존재를 확인했습니다. 이미지 오류 시 처리는 역사책 UI가 담당합니다.
