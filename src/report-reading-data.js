(() => {
  "use strict";

  // Figures follow each filing as published, in the units of its own summary table.
  function report({ title, period, filed, scope, unit, pdf, pages, summaryPage,
    publication, sales, operating, net, assets, liabilities, equity }) {
    return {
      source: "https://heyzine.com/flip-book/" + publication + ".html",
      media: { type: "pdf", url: "assets/reading/reports/" + pdf + ".pdf", title },
      sections: [
        {
          heading: "보고서 개요",
          rows: [
            ["항목", "내용"],
            ["보고기간", period],
            ["제출일", filed],
            ["원문 분량", pages + "쪽"]
          ]
        },
        {
          heading: scope + " 경영실적",
          text: "보고기간 누적 금액입니다. 괄호는 손실을 뜻합니다.",
          rows: [
            ["항목", "금액 (" + unit + ")"],
            ["매출액", sales],
            ["영업이익(손실)", operating],
            ["당기순이익(손실)", net]
          ]
        },
        {
          heading: scope + " 재무상태",
          text: "보고기간 말 기준입니다. 원본 PDF " + summaryPage + "–" + (summaryPage + 1) + "쪽에서 요약재무정보를 볼 수 있습니다.",
          rows: [
            ["항목", "금액 (" + unit + ")"],
            ["자산총계", assets],
            ["부채총계", liabilities],
            ["자본총계", equity]
          ]
        }
      ]
    };
  }

  globalThis.HLBReportReadingData = {
    "ir-half": report({
      title: "HLB 2026년 반기보고서", period: "2026.01.01 – 2026.06.30", filed: "2026.08.14",
      scope: "연결", unit: "천원", pdf: "hlb-2026-h1", pages: 260, summaryPage: 90, publication: "ab669f9ad0",
      sales: "46,691,058", operating: "(45,713,101)", net: "(121,291,099)",
      assets: "907,979,566", liabilities: "485,540,846", equity: "422,438,720"
    }),
    "ir-pharma-half-2026": report({
      title: "HLB제약 2026년 반기보고서", period: "2026.01.01 – 2026.06.30", filed: "2026.08.13",
      scope: "연결", unit: "백만원", pdf: "hlb-pharma-2026-h1", pages: 186, summaryPage: 42, publication: "eb76618991",
      sales: "127,930", operating: "1,002", net: "663",
      assets: "178,029", liabilities: "47,271", equity: "130,758"
    }),
    "ir-quarter-2026-05": report({
      title: "HLB 2026년 1분기보고서", period: "2026.01.01 – 2026.03.31", filed: "2026.05.15",
      scope: "연결", unit: "천원", pdf: "hlb-2026-q1", pages: 238, summaryPage: 89, publication: "ce46db0d29",
      sales: "18,689,150", operating: "(23,192,957)", net: "(40,896,159)",
      assets: "925,442,865", liabilities: "431,572,142", equity: "493,870,723"
    }),
    "ir-annual-2026": report({
      title: "HLB 2025년 사업보고서", period: "2025.01.01 – 2025.12.31", filed: "2026.03.23",
      scope: "연결", unit: "천원", pdf: "hlb-2025-annual", pages: 372, summaryPage: 95, publication: "42dab8389b",
      sales: "84,172,574", operating: "(104,217,337)", net: "(235,415,156)",
      assets: "930,177,639", liabilities: "435,763,870", equity: "494,413,769"
    }),
    "ir-quarter-2025-11": report({
      title: "HLB 2025년 3분기보고서", period: "2025.01.01 – 2025.09.30", filed: "2025.11.14",
      scope: "연결", unit: "천원", pdf: "hlb-2025-q3", pages: 310, summaryPage: 107, publication: "17a8a8d6de",
      sales: "55,507,946", operating: "(74,846,502)", net: "(206,111,602)",
      assets: "703,479,837", liabilities: "250,615,861", equity: "452,863,977"
    }),
    "ir-lifescience-half-2025": report({
      title: "HLB생명과학 2025년 반기보고서", period: "2025.01.01 – 2025.06.30", filed: "2025.08.13",
      scope: "연결", unit: "천원", pdf: "hlb-lifescience-2025-h1", pages: 189, summaryPage: 67, publication: "fe6008bea7",
      sales: "21,208,172", operating: "(12,383,112)", net: "(83,328,071)",
      assets: "482,483,428", liabilities: "168,234,728", equity: "314,248,700"
    }),
    "ir-annual-2025": report({
      title: "HLB 2024년 사업보고서", period: "2024.01.01 – 2024.12.31", filed: "2025.03.21",
      scope: "연결", unit: "천원", pdf: "hlb-2024-annual", pages: 350, summaryPage: 91, publication: "1e1be5503e",
      sales: "68,125,727", operating: "(118,516,153)", net: "(108,026,799)",
      assets: "887,424,813", liabilities: "235,310,995", equity: "652,113,818"
    }),
    "ir-quarter-2024-11": report({
      title: "HLB 2024년 3분기보고서", period: "2024.01.01 – 2024.09.30", filed: "2024.11.14",
      scope: "연결", unit: "천원", pdf: "hlb-2024-q3", pages: 224, summaryPage: 93, publication: "3faf7554c5",
      sales: "42,901,177", operating: "(92,800,632)", net: "(78,330,313)",
      assets: "851,282,010", liabilities: "263,118,406", equity: "588,163,604"
    }),
    "ir-pharma-half-2024": report({
      title: "HLB제약 2024년 반기보고서", period: "2024.01.01 – 2024.06.30", filed: "2024.08.13",
      scope: "개별", unit: "백만원", pdf: "hlb-pharma-2024-h1", pages: 141, summaryPage: 33, publication: "9e3c6b3c09",
      sales: "69,225", operating: "1,850", net: "(1,113)",
      assets: "157,459", liabilities: "41,973", equity: "115,486"
    })
  };
})();
