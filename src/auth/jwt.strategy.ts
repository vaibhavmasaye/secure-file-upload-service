import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      console.log('[JWT Strategy] Validating token payload:', payload);
      // Check token expiration
      const currentTimestamp = Math.floor(Date.now() / 1000);
      console.log('[JWT Strategy] Current timestamp:', currentTimestamp, 'Token expiration:', payload.exp);
      
      if (payload.exp && payload.exp < currentTimestamp) {
        console.log('[JWT Strategy] Token has expired');
        throw new UnauthorizedException('Token has expired');
      }

      console.log('[JWT Strategy] Looking up user with ID:', payload.sub);
      const user = await this.authService.findById(payload.sub);
      
      if (!user) {
        console.log('[JWT Strategy] User not found for ID:', payload.sub);
        throw new UnauthorizedException('User not found');
      }
      
      console.log('[JWT Strategy] User found:', { id: user.id, email: user.email });
      return user;
    } catch (error) {
      console.error('[JWT Strategy] Validation error:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token structure');
    }
  }
}