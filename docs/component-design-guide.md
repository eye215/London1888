# 1888, 런던의 밤 컴포넌트 디자인 가이드

## Design tone

- 전체 톤은 `black / blood red / aged ivory`.
- 배경은 완전한 검정 대신 붉은 기가 있는 어두운 블랙을 사용한다.
- 텍스트는 흰색을 남발하지 않고, 제목/CTA/선택 상태에만 강한 대비를 준다.
- 컴포넌트는 공연 포스터처럼 날카롭고 어두운 인상을 유지하되, 실제 예매 서비스처럼 읽기 쉬워야 한다.

## Tokens

- Primary red: `#b71926`
- Red hover: `#d42a38`
- Dark surface: `#120d0e`
- Dark surface raised: `#181112`
- Border: `rgba(103, 72, 70, .58)`
- Text primary: `#fff8f2`
- Text secondary: `#b7aaa3`
- Radius small: `10px`
- Radius medium: `16px`
- Radius large: `22px`
- Pill radius: `999px`

## Buttons

- `.primary`, `.submit-button`: 가장 중요한 행동. 붉은 배경, pill 또는 medium radius, 최소 높이 50px 이상.
- `.admin-action-button`, `.review-entry-button`, `.danger-button`, `.modal-cancel`: 보조 행동. 어두운 배경과 얇은 붉은 테두리.
- `.text-button`, `.text-link-button`, `.view-more-button`: 링크성 행동. 배경 없이 underline 또는 낮은 대비.

## Cards / panels

- 어두운 정보 카드: `.message-card`, `.utility-card`, `.admin-head`, `.admin-list-panel`, `.cast-list`.
- 밝은 예매 리스트 카드: `.compact-reservation-list article`만 밝은 톤을 유지한다.
- 모든 카드에는 border, radius, 은은한 shadow를 적용해 빈 화면이어도 서비스 페이지처럼 보여야 한다.

## Chips

- 날짜/시간 칩: `.cast-schedule-chip`, `.reservation-tabs button`, `.review-filter-chips button`.
- 선택된 칩은 빨간 배경, 미선택 칩은 어두운 배경과 얇은 테두리.
- 캐스트 일정 칩은 `07.25 SAT · 1PM` 한 줄 유지.

## Forms

- `.field input`, `.field textarea`, `.field select`는 동일한 높이, radius, focus ring 사용.
- 에러는 붉은색 텍스트로 입력 필드 바로 아래에 노출.
- 선택형 카드 `.option`, `.actor`, `.review-actor-chip`은 hover/selected/disabled 상태를 명확히 구분한다.

## Mobile

- 하단 고정바 `.mobile-book`은 safe-area를 고려한다.
- 공유 버튼은 정사각형, 공연후기/예매하기는 동일 높이의 pill 버튼.
- 토스트는 하단 CTA 위에 고정해 버튼을 가리지 않는다.
