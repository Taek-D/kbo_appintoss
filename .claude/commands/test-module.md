# 모듈별 테스트 실행

특정 모듈의 테스트를 실행하고 결과를 분석합니다.

## 사용법
$ARGUMENTS에 모듈명을 전달합니다. (auth, crawler, polling, push, ui)

## 실행 순서

1. 해당 모듈의 테스트 파일 탐색
2. `pnpm test -- --filter $ARGUMENTS` 실행
3. 실패한 테스트가 있으면 원인 분석
4. 수정 제안 또는 자동 수정
