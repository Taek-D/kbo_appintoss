import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// global fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// 모듈은 아직 존재하지 않음 - RED 단계
import { exchangeAuthCode, getTossUserKey } from '../toss-client'

describe('toss-client', () => {
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
