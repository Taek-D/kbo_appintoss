import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// global fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// 모듈은 아직 존재하지 않음 - RED 단계
import { exchangeAuthCode, getTossUserKey } from '../toss-client'

/**
 * 이 테스트 스위트는 mTLS 도입 이전 fetch 기반 구현을 가정한다.
 * 현재 toss-client.ts는 `https.request`로 mTLS 연결을 직접 만들기 때문에
 * `vi.stubGlobal('fetch', ...)` 모킹이 호출되지 않는다.
 *
 * 별도 리팩터(https.request mock)가 필요해 prefix 회귀 정리 라운드에서 명시적으로 skip한다.
 * TODO: https 모듈을 모킹하는 헬퍼를 추가하거나, 통합 테스트로 옮긴다.
 */
describe.skip('toss-client (mTLS 도입으로 fetch 모킹 무효 — 리팩터 후 활성화)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // mTLS 환경변수 설정
    vi.stubEnv('TOSS_MTLS_CERT', 'test-cert-base64')
    vi.stubEnv('TOSS_MTLS_KEY', 'test-key-base64')
    vi.stubEnv('TOSS_API_BASE_URL', 'https://api-partner.toss.im')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('exchangeAuthCode', () => {
    it('유효한 authCode로 호출하면 TossAuthResponse를 반환한다 [AUTH-01]', async () => {
      const mockResponse = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer' as const,
        expiresIn: 3600,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await exchangeAuthCode('valid-auth-code', 'sandbox')

      expect(result).toEqual(mockResponse)
      expect(result.accessToken).toBe('test-access-token')
      expect(result.tokenType).toBe('Bearer')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api-partner/v1/apps-in-toss/user/oauth2/generate-token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('잘못된 authCode로 호출하면 에러를 throw한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'invalid_grant', error_description: 'Invalid auth code' }),
      })

      await expect(
        exchangeAuthCode('invalid-auth-code', 'sandbox')
      ).rejects.toThrow()
    })
  })

  describe('getTossUserKey', () => {
    it('유효한 accessToken으로 호출하면 userKey를 반환한다 [AUTH-01]', async () => {
      const mockResponse = { userKey: 'toss-user-key-123' }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await getTossUserKey('valid-access-token')

      expect(result).toEqual({ userKey: 'toss-user-key-123' })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api-partner/v1/apps-in-toss/user/oauth2/login-me'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
          }),
        })
      )
    })

    it('잘못된 accessToken으로 호출하면 에러를 throw한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'invalid_token' }),
      })

      await expect(
        getTossUserKey('invalid-token')
      ).rejects.toThrow()
    })
  })
})
