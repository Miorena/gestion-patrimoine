import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './types/jwt-payload.interface';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	@Public()
	@Post('login')
	@HttpCode(200)
	login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	@Get('me')
	me(@CurrentUser() user: JwtPayload) {
		return this.authService.getProfile(user.sub);
	}
}
