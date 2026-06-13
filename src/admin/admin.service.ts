import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MetricsService } from './services/metrics.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly metricsService: MetricsService) {}

  async getDashboardData() {
    try {
      const [activeUsers, systemHealth, gamesSummary, recentErrors] =
        await Promise.all([
          this.metricsService.getActiveUsers(24),
          this.metricsService.getSystemHealth(),
          this.metricsService.getGamesSummary(7),
          this.metricsService.getSystemErrors(1, 10),
        ]);

      return {
        overview: {
          activeUsers: (activeUsers as any)?.count || 0,
          systemUptime: (systemHealth as any)?.uptime || 0,
          gamesPlayed: (gamesSummary as any)?.totalGames || 0,
          errorCount: (recentErrors as any)?.total || 0,
        },
        charts: {
          userActivity: (activeUsers as any)?.hourlyBreakdown || [],
          gamesTrend: (gamesSummary as any)?.dailyTrend || [],
        },
        recentErrors: (recentErrors as any)?.errors || [],
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch dashboard data', error.stack);
      throw error;
    }
  }

  async exportToCsv(type: string, days: number) {
    const normalizedType = type?.trim().toLowerCase();
    const normalizedDays = Number(days);

    if (!normalizedType) {
      throw new BadRequestException('Export type is required');
    }

    if (!['users', 'games'].includes(normalizedType)) {
      throw new BadRequestException(`Export type ${type} not supported`);
    }

    if (
      !Number.isInteger(normalizedDays) ||
      normalizedDays < 1 ||
      normalizedDays > 365
    ) {
      throw new BadRequestException('Export days must be between 1 and 365');
    }

    const data = await this.getExportData(normalizedType, normalizedDays);
    const rows = Array.isArray(data) ? data : [];

    return {
      filename: `${normalizedType}_export_${new Date().toISOString().split('T')[0]}.csv`,
      data: this.convertToCSV(rows),
      mimeType: 'text/csv',
      rowCount: rows.length,
    };
  }

  private async getExportData(type: string, days: number) {
    switch (type) {
      case 'users':
        return this.metricsService.getUsersForExport(days);
      case 'games':
        return this.metricsService.getGamesForExport(days);
      default:
        throw new Error(`Export type ${type} not supported`);
    }
  }

  private convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) =>
      Object.values(row)
        .map((value) => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
          if (typeof value === 'string')
            return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(','),
    );

    return [headers, ...rows].join('\n');
  }
}
