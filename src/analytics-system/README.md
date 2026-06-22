# Analytics Module

> Configuration reference (env vars, provider keys): [RUNBOOK.md](../../RUNBOOK.md#environment-variables)
> Module role in overall architecture: [ARCHITECTURE.md](../../ARCHITECTURE.md#module-map)

A comprehensive, standalone analytics module for NestJS applications that supports multiple analytics providers and ensures privacy compliance.

## Features

- **Multiple Provider Support**: PostHog, Mixpanel, Plausible, Google Analytics
- **Privacy Compliant**: Automatic PII sanitization
- **Event Tracking**: Session, game, reward, leaderboard, and interaction events
- **Real-time Dashboards**: Integration with analytics platforms
- **TypeORM Integration**: Optional local event storage
- **Middleware & Interceptors**: Automatic tracking capabilities

## Installation

1. Install dependencies:
\`\`\`bash
npm install posthog-node mixpanel axios uuid class-validator class-transformer
npm install -D @types/uuid
\`\`\`

2. Configure environment variables (see .env.example)

3. Import the AnalyticsModule in your app.module.ts

4. Run database migrations if using local storage

## Usage

### Basic Event Tracking

\`\`\`typescript
// Inject the service
constructor(private analyticsService: AnalyticsService) {}

// Track custom events
await this.analyticsService.track({
  event: 'custom_event',
  sessionId: 'session-123',
  userId: 'user-456',
  timestamp: new Date(),
  properties: {
    customProperty: 'value'
  }
});

// Track specific event types
await this.analyticsService.trackGameStart('game-1', 'puzzle', 'session-123', 'user-456');
await this.analyticsService.trackRewardClaim('reward-1', 'coins', 100, 'daily_bonus', 'session-123', 'user-456');
await this.analyticsService.trackButtonClick('play-button', '/games', 'session-123', 'user-456');
\`\`\`

### Using the Decorator

\`\`\`typescript
@TrackEvent({ event: 'game_completed', properties: { level: 1 } })
@Post('complete-game')
async completeGame() {
  // Your game completion logic
}
\`\`\`

### REST API Endpoints

\`\`\`bash
# Track custom event
POST /analytics/track
{
  "event": "custom_event",
  "sessionId": "session-123",
  "userId": "user-456",
  "timestamp": "2024-01-01T00:00:00Z",
  "properties": {}
}

# Track session start
POST /analytics/session/start
{
  "sessionId": "session-123",
  "userId": "user-456"
}

# Track game start
POST /analytics/game/start
{
  "gameId": "game-1",
  "gameType": "puzzle",
  "sessionId": "session-123",
  "userId": "user-456"
}
\`\`\`

## Event Types

### Session Events
- `session_start`: User starts a session
- `session_end`: User ends a session

### Game Events
- `game_start`: Game begins
- `game_end`: Game ends
- `game_pause`: Game is paused
- `game_resume`: Game is resumed

### Reward Events
- `reward_claim`: User claims a reward
- `reward_view`: User views available rewards
- `reward_earned`: User earns a reward

### Leaderboard Events
- `leaderboard_view`: User views leaderboard
- `leaderboard_filter`: User filters leaderboard
- `leaderboard_share`: User shares leaderboard

### Interaction Events
- `button_click`: Button is clicked
- `link_click`: Link is clicked
- `form_submit`: Form is submitted
- `modal_open`: Modal is opened
- `modal_close`: Modal is closed

## Privacy Compliance

The module automatically:
- Removes PII from event properties
- Sanitizes IP addresses and sensitive metadata
- Provides configurable data retention
- Supports GDPR-compliant analytics providers

## Configuration

### Environment Variables

\`\`\`env
ANALYTICS_ENABLED=true
POSTHOG_API_KEY=your_key
MIXPANEL_TOKEN=your_token
PLAUSIBLE_DOMAIN=yourdomain.com
GA_MEASUREMENT_ID=G-XXXXXXXXXX
\`\`\`

### Provider Configuration

Each provider can be enabled/disabled based on environment variables. The module will automatically initialize only the providers with valid configuration.

## Dashboard Setup

### PostHog
1. Create dashboards for key metrics
2. Set up funnels for user journey analysis
3. Configure retention charts
4. Create alerts for important events

### Mixpanel
1. Create custom dashboards
2. Set up funnel analysis
3. Configure cohort analysis
4. Create retention reports

### Plausible
1. Configure custom events
2. Set up goal tracking
3. Create custom dashboards

### Google Analytics
1. Set up custom events
2. Create conversion goals
3. Configure audience segments
4. Set up custom reports

## Best Practices

1. **Event Naming**: Use consistent, descriptive event names
2. **Properties**: Include relevant context without PII
3. **Session Management**: Maintain consistent session IDs
4. **Error Handling**: The module handles provider failures gracefully
5. **Performance**: Events are tracked asynchronously
6. **Privacy**: Always review tracked data for compliance

## Monitoring

The module includes comprehensive logging and error handling. Monitor your application logs for:
- Provider initialization status
- Event tracking errors
- Performance metrics
- Privacy compliance issues
