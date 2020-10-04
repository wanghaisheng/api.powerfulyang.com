import { Test, TestingModule } from '@nestjs/testing';
import { InstagramBotService } from './instagram-bot.service';

describe('InstagramBotService', () => {
    let service: InstagramBotService;

    beforeEach(async () => {
        jest.setTimeout(1000000);
        const module: TestingModule = await Test.createTestingModule({
            providers: [InstagramBotService],
        }).compile();

        service = module.get<InstagramBotService>(
            InstagramBotService,
        );
        await service.loginIn();
    });

    it('should fetch undo saved be defined', async () => {
        await expect(
            service.fetchUndo().then((res) => res.pop()?.id),
        ).resolves.toBe('2210206425515440308_8404550374');
    });
});
