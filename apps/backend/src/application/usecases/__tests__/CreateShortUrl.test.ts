import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateShortUrl } from '@application/usecases/CreateShortUrl';
import { IUrlRepository } from '@domain/repositories/IUrlRepository';
import { AppError } from '@shared/errors/AppError';

// Mock the shortCode generator
vi.mock('@shared/utils/shortCode', () => ({
    generateShortCode: vi.fn(() => 'mocked1'),
}));

import { generateShortCode } from '@shared/utils/shortCode';

const mockedGenerateShortCode = vi.mocked(generateShortCode);

function createMockRepository(): IUrlRepository {
    return {
        create: vi.fn().mockResolvedValue(undefined),
        findByShortCode: vi.fn().mockResolvedValue(null),
        findAll: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(false),
        recordClick: vi.fn().mockResolvedValue(undefined),
    };
}

describe('CreateShortUrl UseCase', () => {
    let useCase: CreateShortUrl;
    let mockRepo: IUrlRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRepo = createMockRepository();
        useCase = new CreateShortUrl(mockRepo);
        mockedGenerateShortCode.mockReturnValue('mocked1');
        process.env.APP_URL = ''; // Reset APP_URL
        delete process.env.URL_EXPIRATION_DAYS; // Reset expiration
    });

    it('should create a short URL successfully', async () => {
        const result = await useCase.execute({
            originalUrl: 'https://example.com',
        });

        expect(result.getOriginalUrl()).toBe('https://example.com');
        expect(result.getShortCode()).toBe('mocked1');
        expect(result.getVisits()).toBe(0);
        expect(result.isActive()).toBe(true);
        expect(mockRepo.create).toHaveBeenCalledOnce();
    });

    it('should set default 1 day expiration when env var is missing', async () => {
        const before = Date.now();
        const result = await useCase.execute({
            originalUrl: 'https://example.com',
        });
        const after = Date.now();

        const expiresAt = result.getExpiresAt();
        expect(expiresAt).toBeDefined();

        const expected1Day = 1 * 24 * 60 * 60 * 1000;
        const diff = expiresAt!.getTime() - before;

        // Check range with small buffer
        expect(diff).toBeGreaterThanOrEqual(expected1Day - 100);
        expect(diff).toBeLessThanOrEqual(expected1Day + (after - before) + 100);
    });

    it('should use URL_EXPIRATION_DAYS from env', async () => {
        process.env.URL_EXPIRATION_DAYS = '7'; // 7 days

        const before = Date.now();
        const result = await useCase.execute({
            originalUrl: 'https://example.com',
        });
        const after = Date.now();
        const expiresAt = result.getExpiresAt();
        const expected7Days = 7 * 24 * 60 * 60 * 1000;
        const diff = expiresAt!.getTime() - before;

        expect(diff).toBeGreaterThanOrEqual(expected7Days - 100);
        expect(diff).toBeLessThanOrEqual(expected7Days + (after - before) + 100);
    });

    it('should retry when short code already exists', async () => {
        // First call: code exists, second call: code is unique
        (mockRepo.exists as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        mockedGenerateShortCode
            .mockReturnValueOnce('exists1')
            .mockReturnValueOnce('unique1');

        const result = await useCase.execute({
            originalUrl: 'https://example.com',
        });

        expect(result.getShortCode()).toBe('unique1');
        expect(mockRepo.exists).toHaveBeenCalledTimes(2);
        expect(mockedGenerateShortCode).toHaveBeenCalledTimes(2);
    });

    it('should throw AppError 409 after max retries on collision', async () => {
        (mockRepo.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

        await expect(
            useCase.execute({ originalUrl: 'https://example.com' })
        ).rejects.toThrow(AppError);

        await expect(
            useCase.execute({ originalUrl: 'https://example.com' })
        ).rejects.toThrow('Failed to generate unique short code');
    });

    it('should reject self-referential URLs', async () => {
        process.env.APP_URL = 'http://localhost:3000';

        await expect(
            useCase.execute({ originalUrl: 'http://localhost:3000/something' })
        ).rejects.toThrow(AppError);

        await expect(
            useCase.execute({ originalUrl: 'http://localhost:3000/something' })
        ).rejects.toThrow('Cannot shorten URLs pointing to this service');
    });

    it('should allow URLs with different hostname than APP_URL', async () => {
        process.env.APP_URL = 'http://localhost:3000';

        const result = await useCase.execute({
            originalUrl: 'https://google.com',
        });

        expect(result.getOriginalUrl()).toBe('https://google.com');
    });

    it('should call repository.exists to check for collisions', async () => {
        await useCase.execute({ originalUrl: 'https://example.com' });

        expect(mockRepo.exists).toHaveBeenCalledWith('mocked1');
    });
});
