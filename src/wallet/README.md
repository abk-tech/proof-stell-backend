# Wallet Module

> Security controls, auth model, and env vars: [SECURITY_CHECKLIST.md](../../SECURITY_CHECKLIST.md) · [RUNBOOK.md](../../RUNBOOK.md)
> Data flow for wallet transactions: [ARCHITECTURE.md](../../ARCHITECTURE.md#data-flow-wallet-transaction)

---

## Overview

This NestJS module enhances wallet integration logic to gracefully handle edge cases such as dropped connections, rejected transactions, and network switching. It provides an abstraction layer for interacting with different wallet providers (e.g., ArgentX, Braavos) and emits events for critical wallet lifecycle changes.

**Note**: This module primarily focuses on the backend's role in wallet interactions. Direct connection to browser wallet extensions (like ArgentX or Braavos) typically occurs on the frontend. The backend receives requests (e.g., to send a transaction, verify a signature) from the frontend, which has already established the wallet connection.

## Features

-   **Multi-Wallet Provider Support**: Easily integrate and switch between different wallet providers (ArgentX, Braavos mock implementations included).
-   **Centralized Wallet Service**: A single service to manage wallet connections, send transactions, and sign messages, abstracting provider-specific logic.
-   **Robust Error Handling**: Custom exceptions for common wallet issues (e.g., `UserRejectedTransactionException`, `NetworkMismatchException`).
-   **Event-Driven Architecture**: Utilizes `@nestjs/event-emitter` to broadcast wallet events (connected, disconnected, transaction sent/rejected, network switched, errors) for other parts of your application to react to.
-   **Automatic Network Switching**: Attempts to switch the wallet's network if a transaction is initiated on the wrong chain.
-   **Retry Logic**: Implements basic retry mechanisms for transient transaction failures.
-   **Interceptor for Error Standardization**: Catches wallet-specific exceptions and transforms them into standardized HTTP responses.

## Installation

1.  Install dependencies:
    \`\`\`bash
    npm install @nestjs/event-emitter ethers class-validator class-transformer
    npm install -D @types/ethers
    \`\`\`
2.  Configure environment variables (see `.env.example`) to enable/disable specific wallet providers.
3.  Import `WalletModule` into your `AppModule`:
    \`\`\`typescript
    // src/app.module.ts
    import { Module } from '@nestjs/common';
    import { WalletModule } from './wallet/wallet.module';

    @Module({
      imports: [WalletModule],
      // ... other modules
    })
    export class AppModule {}
    \`\`\`

## Usage

### 1. Wallet Service

Inject `WalletService` into your controllers or other services to perform wallet operations.

\`\`\`typescript
// src/some-feature/some-feature.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { UserRejectedTransactionException } from '../wallet/exceptions/wallet.exception';

@Injectable()
export class SomeFeatureService {
  private readonly logger = new Logger(SomeFeatureService.name);

  constructor(private walletService: WalletService) {}

  async performWalletAction(providerName: string, userAddress: string) {
    try {
      // 1. Connect to a wallet (simulated on backend, typically frontend initiates)
      const connectionStatus = await this.walletService.connect(providerName);
      this.logger.log(`Connected: ${connectionStatus.address}`);

      // 2. Get current chain ID
      const chainId = await this.walletService.getChainId();
      this.logger.log(`Current Chain ID: ${chainId}`);

      // 3. Send a transaction
      const transactionHash = await this.walletService.sendTransaction(
        {
          to: '0xRecipientAddress',
          value: '100000000000000000', // 0.1 ETH in wei
          chainId: '0x1', // Expected chain ID
        },
        userAddress
      );
      this.logger.log(`Transaction sent: ${transactionHash}`);

      // 4. Sign a message
      const signature = await this.walletService.signMessage('Hello, NestJS!', userAddress);
      this.logger.log(`Message signed: ${signature.serialized}`);

    } catch (error) {
      if (error instanceof UserRejectedTransactionException) {
        this.logger.warn('User cancelled the wallet operation.');
        // Handle user-facing message
      } else {
        this.logger.error('Wallet operation failed:', error.message);
        // Log error, notify admin, etc.
      }
    } finally {
      // 5. Disconnect (optional, depending on session management)
      await this.walletService.disconnect();
    }
  }
}
\`\`\`

### 2. Listening to Wallet Events

You can set up event listeners in any service or module that needs to react to wallet lifecycle events.

\`\`\`typescript
// src/user-session/user-session.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  WalletConnectedEvent,
  WalletDisconnectedEvent,
  WalletTransactionRejectedEvent,
  WalletNetworkSwitchedEvent,
  WalletErrorEvent,
  WalletEvents,
} from '../wallet/interfaces/wallet.interface';

@Injectable()
export class UserSessionService {
  private readonly logger = new Logger(UserSessionService.name);

  @OnEvent(WalletEvents.CONNECTED)
  handleWalletConnected(payload: WalletConnectedEvent) {
    this.logger.log(`[UserSession] User ${payload.address} connected via ${payload.providerName}.`);
    // Update user's session, load user-specific data, etc.
  }

  @OnEvent(WalletEvents.DISCONNECTED)
  handleWalletDisconnected(payload: WalletDisconnectedEvent) {
    this.logger.log(`[UserSession] User ${payload.address} disconnected from ${payload.providerName}.`);
    // Clear user's session, invalidate tokens, etc.
  }

  @OnEvent(WalletEvents.TRANSACTION_REJECTED)
  handleTransactionRejected(payload: WalletTransactionRejectedEvent) {
    this.logger.warn(`[UserSession] Transaction rejected by ${payload.address}: ${payload.error?.message}`);
    // Log for analytics, send a notification to the user
  }

  @OnEvent(WalletEvents.NETWORK_SWITCHED)
  handleNetworkSwitched(payload: WalletNetworkSwitchedEvent) {
    this.logger.log(
      `[UserSession] User ${payload.address} switched from ${payload.oldChainId} to ${payload.newChainId}.`
    );
    // Re-fetch data relevant to the new network
  }

  @OnEvent(WalletEvents.ERROR)
  handleWalletError(payload: WalletErrorEvent) {
    this.logger.error(
      `[UserSession] Wallet error for ${payload.address} via ${payload.providerName}: ${payload.error?.message}`
    );
    // Log for debugging, trigger alerts for critical errors
  }
}
\`\`\`

### 3. REST API Endpoints (Example)

The `WalletController` provides example endpoints to interact with the `WalletService`. These would typically be called by your frontend.

\`\`\`bash
# Connect to ArgentX (simulated)
POST /wallet/connect
Content-Type: application/json
{
  "providerName": "ArgentX"
}

# Get connection status
GET /wallet/status

# Get connected accounts
GET /wallet/accounts

# Send a transaction (simulated)
POST /wallet/send-transaction
Content-Type: application/json
{
  "providerName": "ArgentX",
  "fromAddress": "0xArgentXUserAddress",
  "to": "0xAnotherAddress",
  "value": "100000000000000000",
  "chainId": "0x1"
}

# Sign a message (simulated)
POST /wallet/sign-message
Content-Type: application/json
{
  "providerName": "ArgentX",
  "address": "0xArgentXUserAddress",
  "message": "My custom message to sign"
}

# Switch network (simulated)
POST /wallet/switch-network
Content-Type: application/json
{
  "providerName": "ArgentX",
  "chainId": "0x5" # Goerli Testnet
}

# Disconnect
POST /wallet/disconnect
\`\`\`

## Handling Edge Cases

-   **Dropped Connections**: The `WalletService` maintains `_isConnected` state. If a wallet operation is attempted when `_isConnected` is false, `WalletNotConnectedException` is thrown. The frontend should re-initiate connection.
-   **Rejected Transactions**: `UserRejectedTransactionException` is thrown when a user declines a transaction or signature request. This is caught by the `WalletErrorInterceptor` and `WalletService` emits a `wallet.transaction.rejected` event.
-   **Network Switching**: When `sendTransaction` is called, it checks if the wallet's current chain matches the transaction's `chainId`. If not, it attempts to call `provider.switchNetwork()`. If successful, it retries the transaction. If switching fails, `NetworkMismatchException` is thrown.
-   **Transient Failures**: `sendTransaction` includes a basic retry mechanism with exponential backoff for non-user-rejected errors.
-   **Error Standardization**: The `WalletErrorInterceptor` ensures that all wallet-related exceptions are caught and transformed into consistent HTTP responses, making API error handling predictable for the frontend.

This module provides a robust and extensible way to manage wallet interactions from your NestJS backend, focusing on reliability and graceful error handling.
