import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Provider, Account, Contract } from 'starknet';
import { TypedConfigService } from '../common/config/typed-config.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsEvent } from '../analytics/analytics-event.enum';

@Injectable()
export class BlockchainService {
  private provider: Provider;
  private account: Account;

  constructor(
    private readonly configService: TypedConfigService,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsService: AnalyticsService,
  ) {
    this.provider = new Provider({
      nodeUrl: 'https://starknet-goerli.g.alchemy.com/v2/demo',
    });
    const privateKey = this.configService.starknetPrivateKey;
    const accountAddress = this.configService.starknetAccountAddress;
    this.account = new Account(this.provider, accountAddress, privateKey);
  }

  async checkHealth(): Promise<void> {
    try {
      await this.provider.getBlockNumber();
    } catch {
      throw new Error('Blockchain provider is unavailable');
    }
  }

  async sendMintTx(userId: number): Promise<{ transaction_hash: string }> {
    const contractAddress = this.configService.mintContractAddress;
    const tx = await this.account.execute({
      contractAddress,
      entrypoint: 'mint',
      calldata: [userId.toString()],
    });
    if (this.analyticsService) {
      await this.analyticsService.track(AnalyticsEvent.TokenMinted, {
        userId: String(userId),
        metadata: { transaction_hash: tx.transaction_hash },
      });
    }
    return { transaction_hash: tx.transaction_hash };
  }

  async sendTransferTx(
    fromUserId: number,
    toUserId: number,
    amount: number,
  ): Promise<{ transaction_hash: string }> {
    const contractAddress = this.configService.mintContractAddress;
    const tx = await this.account.execute({
      contractAddress,
      entrypoint: 'transfer',
      calldata: [fromUserId.toString(), toUserId.toString(), amount.toString()],
    });
    if (this.analyticsService) {
      await this.analyticsService.track(AnalyticsEvent.TokenTransferred, {
        userId: String(fromUserId),
        metadata: { toUserId, amount, transaction_hash: tx.transaction_hash },
      });
    }
    return { transaction_hash: tx.transaction_hash };
  }

  async sendBurnTx(
    userId: number,
    amount: number,
  ): Promise<{ transaction_hash: string }> {
    const contractAddress = this.configService.mintContractAddress;
    const tx = await this.account.execute({
      contractAddress,
      entrypoint: 'burn',
      calldata: [userId.toString(), amount.toString()],
    });
    if (this.analyticsService) {
      await this.analyticsService.track(AnalyticsEvent.TokenBurned, {
        userId: String(userId),
        metadata: { amount, transaction_hash: tx.transaction_hash },
      });
    }
    return { transaction_hash: tx.transaction_hash };
  }

  async getBalance(userId: number): Promise<{ balance: string }> {
    const contractAddress = this.configService.mintContractAddress;
    const contract = new Contract([], contractAddress, this.provider);
    const result = await contract.call('balanceOf', [userId.toString()]);
    const balance = result?.toString() || '0';
    return { balance };
  }
}
