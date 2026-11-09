# HLB 유니버스

활화산의 칼데라를 걸으며 HLB그룹 자료를 읽는 3인칭 3D 인포뱅크입니다. 나침반이 있는 그룹안내소, 브랜드 갤러리, 제품 전시실, IR 서가, ESG 온실, 에데꼬론 향 전시관을 방문할 수 있습니다. 건물의 열람대와 상품 전시대에서 E를 누르면 현재 위치에서 팝업이 열립니다.

## 실행

VS Code에서 이 폴더를 열고 Node.js 18 이상으로 실행합니다. 그래픽 엔진과 전시 공간을 구성하는 파일은 프로젝트에 들어 있습니다.

```sh
npm start
```

[HLB 유니버스](http://127.0.0.1:4173/)를 열면 칼데라 광장에서 시작합니다. 프로젝트 안에 엔진과 자료가 들어 있어 npm install은 필요하지 않습니다. PowerShell에서 npm 실행이 차단되면 `npm.cmd start`를 사용하세요. WebGL이 지원되지 않는 환경에서도 ‘자료 검색’은 사용할 수 있습니다.

## 산책과 열람

- **걷기** — 방향키 또는 WASD로 이동합니다. 휴대폰에서는 왼쪽 조이스틱을 끕니다. 바닥을 클릭하거나 터치하면 해당 지점까지 걸어갑니다.
- **점프와 폭죽** — 스페이스바로 점프하고 F 키로 폭죽을 쏩니다. 휴대폰에서는 오른쪽 아래의 점프와 폭죽 버튼을 사용합니다. 폭죽이 터지면 ‘Human Life Better HLB’가 나타납니다.
- **시점** — 화면을 드래그해 캐릭터 주위를 둘러봅니다. 휠 또는 두 손가락으로 카메라 거리를 조절합니다. 야외에서 ‘전경’을 누르면 유니버스를 위에서 넓게 내려다보고, 다시 누르면 캐릭터 가까이 돌아옵니다.
- **낮과 밤** — 화면 오른쪽 위에서 낮이나 밤을 선택합니다. 선택한 시간대는 다음 방문에도 적용됩니다.
- **음향** — 피아노·비올라·첼로를 위한 80초 길이의 무가사 창작곡 ‘칼데라의 산책’이 반복됩니다. 브라우저가 자동 재생을 제한하면 첫 클릭·터치·키 입력 후 시작합니다. ‘음향’에서 음량을 조절하거나 음소거할 수 있습니다.
- **방문** — 건물의 열린 정문으로 들어갑니다. 길을 찾으려면 ‘공간 안내’에서 목적지를 선택합니다.
- **열람** — 실내 열람대 앞에서 E 키나 ‘자료 보기’ 버튼을 누릅니다. 상단 ‘자료 검색’에서도 같은 열람창을 사용할 수 있습니다. ‘자료 목록’으로 돌아가면 검색과 필터가 유지되고, ×를 누르면 그 자리에서 산책을 이어갑니다.
- **문서와 표** — 자료를 선택하면 주요 내용이나 표가 즉시 표시됩니다. ‘원본 보기’에서 PDF 전체 페이지를 넘기거나 쪽 번호로 이동하고 확대할 수 있습니다. 연락처·공식 채널·비전 표에는 자료 내 검색이 있습니다.
- **에데꼬론** — 공간 안내에서 걸어가거나 [상품관 내부에서 시작](http://127.0.0.1:4173/?visit=cologne)할 수 있습니다. 디퓨저나 카트리지 진열대를 클릭하면 캐릭터가 다가가 설명을 엽니다. ‘전시 안내’에서 목적지를 선택하거나 직접 걸어가 E를 눌러도 됩니다.
- **연결 범위** — 팝업 본문과 PDF 19권은 로컬 서버만으로 열립니다. 영상 3편과 대화형 사업장 지도는 원 게시자의 플레이어를 팝업 안에 표시하므로 인터넷이 필요합니다. 사업장 주소 목록과 영상 소개는 연결 없이도 읽을 수 있습니다.

| 전시관 | 열람 자료 |
| --- | --- |
| 그룹안내소 | 그룹사 위치, 연락처와 공식 채널 |
| 브랜드관 | 비전·슬로건, 브로슈어, 회사소개서와 영상 |
| 제품전시관 | 국·영문 제품 카탈로그 |
| IR 자료관 | 투자자 자료, IR 영상, 2024~2026년 정기보고서 |
| ESG 정원 | 국·영문 ESG 보고서 |
| 에데꼬론 상품관 | AI de cologne 퍼스널 디퓨저, 세 계열의 향 카트리지 9종과 조합 |

## 개발

| 파일 | 역할 |
| --- | --- |
| `src/world3d.js`, `src/hall-designs.js` | 화산 지형, 건물별 외관·실내 전시와 충돌 영역 |
| `src/time-of-day.js` | 낮·밤 하늘, 광원과 건물 야간 조명 |
| `src/chamber-music.js` | ‘칼데라의 산책’ 악보, 연주와 음량 설정 |
| `src/cologne-gallery.js`, `src/cologne-reading.js` | 에데꼬론 상품관의 건축·전시물과 제품 설명·향별 데이터 |
| `src/player3d.js` | 3D 캐릭터와 관절, 보행, 길찾기, 카메라와 입력 |
| `src/app.js` | 장면 렌더링, 위치에 따른 열람, 자료 검색, 모바일 조이스틱 |
| `index.html`, `styles.css` | 조작 메뉴, 공간 안내, 열람창 |
| `src/catalog-data.js` | 자료 목록과 원문 주소 |
| `src/catalog.js` | 비동기 조회와 검색·필터 |
| `src/reading-data.js`, `src/report-reading-data.js` | 자료 ID별 본문·표·미디어 및 보고서 요약 |
| `src/reader.js`, `src/pdf-viewer.js` | 열람창, 자료 내 검색, PDF 페이지·확대·텍스트 보기 |
| `assets/reading/` | 브로슈어·제품·ESG 등 원본 PDF와 정기보고서 |
| `assets/vendor/` | 로컬 Three.js, Mozilla PDF.js 및 라이선스 |

자료 26건은 [HLB그룹 인포뱅크](https://mysterious-bait-6ee.notion.site/HLB-HLB-Group-18fdd42135be809fbf3cc031182c8ff2)에서 선별한 24건과 제공받은 에데꼬론 원본 PDF 2건입니다. 자료를 갱신할 때는 카탈로그와 열람 데이터의 자료 ID를 일치시키고 로컬 원본을 교체하세요. 서버·DB를 연결할 때는 공간 ID와 자료 ID를 유지한 채 `HLBCatalog.loadResources()` 및 `src/reader.js`의 상세 조회를 API로 교체하면 됩니다.

자동 검사는 아래 명령으로 실행합니다.

```sh
npm test
```

## GitHub Pages로 공개하기

1. 프로젝트를 GitHub의 `hlbbusisup-creator/hlb-universe` 저장소의 `main` 브랜치에 올립니다. GitHub Free에서는 공개 저장소를 사용하며, 저장소에 커밋한 소스와 파일도 누구나 볼 수 있습니다.
2. GitHub 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. **Actions → Deploy HLB Universe to GitHub Pages → Run workflow**에서 `main`을 선택해 실행합니다. `build`와 `deploy`가 성공하면 **Settings → Pages → Visit site**에서 공개 주소를 확인할 수 있습니다.

배포 후에는 GitHub 로그인 없이 [HLB 유니버스](https://hlbbusisup-creator.github.io/hlb-universe/)와 [에데꼬론 상품관](https://hlbbusisup-creator.github.io/hlb-universe/?visit=cologne)에 접속할 수 있습니다.

전시 자료를 수정한 뒤 VS Code에서 커밋하고 **변경 내용 동기화**를 누르면 `main`에 올린 버전이 같은 주소에 반영됩니다. 워크플로는 `npm test`와 `npm run build`를 실행하고 `dist/site`에 담긴 화면과 전시 자료를 배포합니다. [GitHub Pages 배포 설정 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
