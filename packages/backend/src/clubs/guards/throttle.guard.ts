import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Simple in-memory throttling implementation
 * Tracks request counts per IP address within a time window
 */
interface ThrottleRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly requests = new Map<string, ThrottleRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    // Default: 10 requests per 60 seconds
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.windowMs * 2);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getIpAddress(request);

    const now = Date.now();
    const record = this.requests.get(ip);

    // Check if we need to reset the window
    if (!record || now > record.resetAt) {
      this.requests.set(ip, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    // Check if limit exceeded
    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      throw new HttpException(
        `Too many requests. Please try again in ${retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    record.count++;
    return true;
  }

  private getIpAddress(request: Request): string {
    // Try to get real IP from proxy headers
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return ips.trim();
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.requests.entries()) {
      if (now > record.resetAt) {
        this.requests.delete(ip);
      }
    }
  }
}
