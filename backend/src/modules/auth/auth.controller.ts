import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { InitialAdminDto, LoginDto, LoginResponseDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('initial-admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bootstrap the initial system administrator' })
  @ApiResponse({ status: 201, description: 'Initial admin created successfully' })
  @ApiResponse({ status: 409, description: 'Admin already exists' })
  async createInitialAdmin(@Body() dto: InitialAdminDto) {
    return this.authService.createInitialAdmin(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with 10-digit National ID and password' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setSessionCookie(res, result.sessionId, result.rememberMe, result.sessionTtlSeconds);

    return { role: result.role, user: result.user };
  }

  @Public()
  @Post('mobile-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate the native student app and return its opaque session credential',
  })
  @ApiResponse({ status: 200, description: 'Authenticated successfully', type: LoginResponseDto })
  async mobileLogin(@Body() dto: LoginDto) {
    if (dto.client !== 'student') {
      throw new BadRequestException('The mobile login endpoint is reserved for the student client');
    }

    const result = await this.authService.login(dto);
    return {
      sessionId: result.sessionId,
      role: result.role,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(sessionId);
    res.clearCookie('sessionId', this.cookieOptions());
    return { success: true };
  }

  @Get('csrf')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the CSRF token for the current browser session' })
  getCsrfToken(@CurrentUser('csrfToken') csrfToken: string) {
    return { csrfToken };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  private setSessionCookie(
    res: Response,
    sessionId: string,
    rememberMe: boolean,
    sessionTtlSeconds: number,
  ): void {
    res.cookie('sessionId', sessionId, {
      ...this.cookieOptions(),
      ...(rememberMe ? { maxAge: sessionTtlSeconds * 1000 } : {}),
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1',
    };
  }
}
