# TDD 사이클 실행

Red → Green → Refactor 사이클을 실행합니다.

## 사용법
$ARGUMENTS에 구현할 기능을 설명합니다.

## 실행 순서

1. **Red**: 실패하는 테스트를 먼저 작성
2. `pnpm test --run` 으로 실패 확인
3. **Green**: 테스트를 통과하는 최소 구현
4. `pnpm test --run` 으로 성공 확인
5. **Refactor**: 코드 정리 (테스트 유지)
6. `pnpm test --run` 으로 최종 확인

## 대상 모듈 (TDD 필수)
- Auth & User Module
- KBO Crawler Module
- Smart Polling Worker
- Toss Push Provider
