import {
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InputEventType } from '../entities/input-event.entity';

export class InputEventDto {
  @IsEnum(InputEventType)
  eventType: InputEventType;

  @IsNumber()
  @Min(0)
  timestamp: number;

  @IsObject()
  eventData: {
    x?: number;
    y?: number;
    key?: string;
    target?: string;
    accuracy?: number;
    [key: string]: any;
  };

  @IsOptional()
  @IsString()
  clientId?: string;
}

export class ReportSessionDto {
  @IsUUID()
  challengeId: string;

  @IsNumber()
  @Min(0)
  @Max(1000000) // Prevent absurd score spoofing
  score: number;

  @IsNumber()
  @Min(0)
  @Max(3600000) // Max 1 hour
  duration: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InputEventDto)
  @ArrayMaxSize(10000) // Prevent abuse
  inputs: InputEventDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsUUID()
  sessionId: string;

  @IsString()
  signature: string; // HMAC-SHA256 signature
}
