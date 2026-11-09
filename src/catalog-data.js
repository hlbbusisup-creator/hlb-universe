(() => {
  const notion = "https://mysterious-bait-6ee.notion.site/";

  const spaces = [
    {
      id: "group",
      title: "그룹안내소",
      subtitle: "그룹사 · 연락처",
      description: "그룹사 위치와 연락처, 공식 소셜미디어를 찾을 수 있습니다."
    },
    {
      id: "brand",
      title: "브랜드관",
      subtitle: "비전 · 홍보자료",
      description: "그룹사의 비전과 슬로건, 대외 소개에 사용할 브로슈어와 영상을 모았습니다."
    },
    {
      id: "product",
      title: "제품전시관",
      subtitle: "제품 카탈로그",
      description: "그룹사의 제품을 한 권에 담은 국문·영문 카탈로그를 열람합니다."
    },
    {
      id: "ir",
      title: "IR 자료관",
      subtitle: "투자정보 · 정기보고서",
      description: "회사별 투자자 자료와 IR 영상, 정기보고서를 살펴볼 수 있습니다."
    },
    {
      id: "esg",
      title: "ESG 정원",
      subtitle: "지속가능경영",
      description: "HLB의 지속가능경영 활동을 국문·영문 ESG 보고서로 확인합니다."
    },
    {
      id: "cologne",
      title: "에데꼬론 상품관",
      subtitle: "AI de cologne · 디퓨저와 향 카트리지",
      description: "AI de cologne의 퍼스널 디퓨저와 아홉 가지 향 카트리지를 전시합니다."
    }
  ];

  const resources = [
    {
      id: "cologne-diffuser", space: "cologne", title: "AI de cologne 퍼스널 디퓨저",
      company: "HLB그룹", type: "제품 브로슈어", language: "국문",
      description: "에데꼬론 퍼스널 디퓨저의 본체와 세 카트리지의 구조를 살펴봅니다.",
      keywords: ["에데꼬론", "디퓨저", "퍼스널디퓨저", "브로셔", "향", "테트라포드"],
      url: "assets/reading/cologne/diffuser.pdf"
    },
    {
      id: "cologne-cartridges", space: "cologne", title: "AI de cologne 향 카트리지",
      company: "HLB그룹", type: "향 카트리지 소개서", language: "국문",
      description: "에데꼬론의 세 향 계열, 아홉 가지 향과 추천 조합을 살펴봅니다.",
      keywords: ["에데꼬론", "디퓨저", "프래그런스", "향카트리지", "향료", "티 우디", "아이리스 머스크", "플로럴 스웨이드"],
      url: "assets/reading/cologne/cartridges.pdf"
    },
    {
      id: "group-map", space: "group", title: "HLB 그룹사 지도",
      company: "HLB그룹", type: "지도",
      description: "Google 지도에서 그룹사별 실제 사업장 위치를 확인합니다.",
      keywords: ["계열사", "위치", "사업장", "찾아오는 길", "map"],
      url: notion + "HLB-1c0dd42135be8034bac4c17a611a7ec9"
    },
    {
      id: "contact", space: "group", title: "회사별 주소, 전화, 팩스",
      company: "HLB그룹", type: "연락처",
      description: "그룹사별 주소와 전화번호, 팩스번호를 찾아봅니다.",
      keywords: ["계열사", "주소록", "대표번호", "연락망", "fax", "contact"],
      url: notion + "1aedd42135be80d6a71df553a5aaa895"
    },
    {
      id: "social", space: "group", title: "HLB 그룹사 소셜미디어 링크",
      company: "HLB그룹", type: "공식 채널",
      description: "그룹사별 공식 채널을 찾고 주소를 복사합니다.",
      keywords: ["SNS", "소셜 미디어", "공식채널", "social media"],
      url: notion + "HLB-Social-Media-19fdd42135be80fba0ebf0e3a67d0851"
    },
    {
      id: "vision", space: "brand", title: "HLB 그룹사 2026 비전·슬로건",
      company: "HLB그룹", type: "비전·슬로건", year: 2026,
      description: "그룹사별 2026년 비전과 슬로건을 확인합니다.",
      keywords: ["그룹 소개", "vision", "slogan"],
      url: notion + "198dd42135be80f4a101f511ffd5c37f?v=198dd42135be80ffa393000c03f651f7"
    },
    {
      id: "brochure-ko", space: "brand", title: "HLB그룹 브로슈어",
      company: "HLB그룹", type: "브로슈어", language: "국문",
      description: "HLB그룹을 소개하는 국문 브로슈어입니다.",
      keywords: ["그룹 소개서", "기업 소개"],
      url: notion + "HLB-18fdd42135be80b4bbacf156facc2286"
    },
    {
      id: "brochure-en", space: "brand", title: "HLB Group Brochure",
      company: "HLB그룹", type: "브로슈어", language: "영문",
      description: "HLB그룹을 소개하는 영문 브로슈어입니다.",
      keywords: ["그룹 소개서", "기업 소개"],
      url: notion + "HLB-Group-Brochure-Eng-18fdd42135be8015b19be48f72c906be"
    },
    {
      id: "brand-film-ko", space: "brand", title: "HLB이노베이션 회사소개 영상",
      company: "HLB이노베이션", type: "영상", language: "국문",
      description: "HLB이노베이션을 소개하는 국문 홍보영상입니다.",
      keywords: ["동영상", "회사 소개", "홍보 영상", "video", "innovation"],
      url: notion + "HLB-1d2dd42135be80fc9e85d6c301ce46d6"
    },
    {
      id: "brand-film-en", space: "brand", title: "HLB이노베이션 회사소개 영상",
      company: "HLB이노베이션", type: "영상", language: "영문",
      description: "HLB이노베이션을 소개하는 영문 홍보영상입니다.",
      keywords: ["동영상", "회사 소개", "홍보 영상", "video", "innovation"],
      url: notion + "HLB-ENG-1d1dd42135be80729a2ef4543ebe61f7"
    },
    {
      id: "brand-profile", space: "brand", title: "HLB생활건강 회사소개서",
      company: "HLB생활건강", type: "회사소개서",
      description: "HLB생활건강의 회사소개서를 열람합니다.",
      keywords: ["사업부 소개", "기업 소개서", "company profile"],
      url: notion + "1c3dd42135be80a8a968fb4df4c22f07"
    },
    {
      id: "products-ko", space: "product", title: "HLB그룹 제품 리스트",
      company: "HLB그룹", type: "제품 카탈로그", language: "국문",
      description: "법인·브랜드별 제품과 구매 링크를 정리한 국문 전자책입니다.",
      keywords: ["제품 목록", "제품 리스트", "product list", "제품 소개"],
      url: notion + "HLB-18fdd42135be8075a45bd209799b54c6"
    },
    {
      id: "products-en", space: "product", title: "HLB Group Product List",
      company: "HLB그룹", type: "제품 카탈로그", language: "영문",
      description: "HLB그룹의 제품을 소개하는 영문 제품 목록입니다.",
      keywords: ["제품 목록", "제품 리스트", "제품 소개"],
      url: notion + "HLB-Group-Product-List-Eng-222dd42135be80d095e0d9e476c1b6b6"
    },
    {
      id: "ir-film", space: "ir", title: "HLB글로벌 IR 홍보영상",
      company: "HLB글로벌", type: "영상",
      description: "HLB글로벌의 투자자 대상 홍보영상입니다.",
      keywords: ["기업설명", "투자설명", "동영상", "investor relations", "global"],
      url: notion + "HLB-IR-1cadd42135be8095b85ff806b8b27f04"
    },
    {
      id: "ir-pharma", space: "ir", title: "HLB제약 IR자료",
      company: "HLB제약", type: "IR 자료",
      description: "HLB제약의 투자자용 IR 자료를 열람합니다.",
      keywords: ["상장사", "기업설명", "투자설명", "investor relations"],
      url: notion + "19fdd42135be80d29d85fa2b3ebdb8dd"
    },
    {
      id: "ir-half", space: "ir", title: "[HLB] 반기보고서(2026.08.14)",
      company: "HLB", type: "정기보고서", year: 2026,
      description: "2026년 8월 14일자 HLB 반기보고서입니다.",
      keywords: ["공시", "반기 보고서", "상반기", "2026.08.14", "semi-annual report"],
      url: notion + "402dd42135be8041823aff8406dcddeb"
    },
    {
      id: "ir-pharma-half-2026", space: "ir", title: "[HLB제약] 반기보고서(2026.08.13)",
      company: "HLB제약", type: "정기보고서", year: 2026,
      description: "2026년 8월 13일자 HLB제약 반기보고서입니다.",
      keywords: ["공시", "반기 보고서", "semi-annual report"],
      url: notion + "HLB-2026-08-13-402dd42135be8058bd23c09f72ddca8f"
    },
    {
      id: "ir-quarter-2026-05", space: "ir", title: "[HLB] 분기보고서(2026.05.15)",
      company: "HLB", type: "정기보고서", year: 2026,
      description: "2026년 5월 15일자 HLB 분기보고서입니다.",
      keywords: ["공시", "분기 보고서", "quarterly report"],
      url: notion + "HLB-2026-05-15-36cdd42135be800f970aee826f21a4bd"
    },
    {
      id: "ir-annual-2026", space: "ir", title: "[HLB] 사업보고서(2026.03.23)",
      company: "HLB", type: "정기보고서", year: 2026,
      description: "2026년 3월 23일자 HLB 사업보고서입니다.",
      keywords: ["공시", "사업 보고서", "연간 보고서", "annual report"],
      url: notion + "HLB-2026-03-23-22ddd42135be8195a5e2df0713d05a22"
    },
    {
      id: "ir-quarter-2025-11", space: "ir", title: "[HLB] 분기보고서(2025.11.14)",
      company: "HLB", type: "정기보고서", year: 2025,
      description: "2025년 11월 14일자 HLB 분기보고서입니다.",
      keywords: ["공시", "분기 보고서", "quarterly report"],
      url: notion + "HLB-2025-11-14-364dd42135be81e99321d9d50c482efb"
    },
    {
      id: "ir-lifescience-half-2025", space: "ir", title: "[HLB생명과학] 반기보고서(2025.08.13)",
      company: "HLB생명과학", type: "정기보고서", year: 2025,
      description: "2025년 8월 13일자 HLB생명과학 반기보고서입니다.",
      keywords: ["공시", "반기 보고서", "semi-annual report"],
      url: notion + "HLB-2025-08-13-364dd42135be8160a41ac89ad1bf1259"
    },
    {
      id: "ir-annual-2025", space: "ir", title: "[HLB] 사업보고서(2025.03.21)",
      company: "HLB", type: "정기보고서", year: 2025,
      description: "2025년 3월 21일자 HLB 사업보고서입니다.",
      keywords: ["공시", "사업 보고서", "연간 보고서", "annual report"],
      url: notion + "HLB-2025-03-21-364dd42135be8118a560caf9a89e347b"
    },
    {
      id: "ir-quarter-2024-11", space: "ir", title: "[HLB] 분기보고서(2024.11.14)",
      company: "HLB", type: "정기보고서", year: 2024,
      description: "2024년 11월 14일자 HLB 분기보고서입니다.",
      keywords: ["공시", "분기 보고서", "quarterly report"],
      url: notion + "HLB-2024-11-14-1addd42135be8092a3c2caf8453b0778"
    },
    {
      id: "ir-pharma-half-2024", space: "ir", title: "[HLB제약] 반기보고서(2024.08.13)",
      company: "HLB제약", type: "정기보고서", year: 2024,
      description: "2024년 8월 13일자 HLB제약 반기보고서입니다.",
      keywords: ["공시", "반기 보고서", "semi-annual report"],
      url: notion + "HLB-2024-08-13-1addd42135be8076a88fc74ffeb7541e"
    },
    {
      id: "esg-ko", space: "esg", title: "HLB ESG 보고서",
      company: "HLB", type: "ESG 보고서", language: "국문",
      description: "HLB의 ESG 활동을 담은 국문 보고서입니다.",
      keywords: ["지속가능경영", "지속 가능 경영 보고서", "환경 사회 지배구조", "sustainability"],
      url: notion + "HLB-ESG-1cbdd42135be80f78086f94fbb2d4028"
    },
    {
      id: "esg-en", space: "esg", title: "HLB ESG Report",
      company: "HLB", type: "ESG 보고서", language: "영문",
      description: "HLB의 ESG 활동을 담은 영문 보고서입니다.",
      keywords: ["지속가능경영", "지속 가능 경영 보고서", "환경 사회 지배구조", "sustainability"],
      url: notion + "HLB-ESG-Report-1cbdd42135be805a94cefecbe6dac33b"
    }
  ];

  globalThis.HLBCatalogData = { spaces, resources };
})();
