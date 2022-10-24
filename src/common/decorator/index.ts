import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '@/common/authorization/admin-guard';
import { AccessGuard } from '@/common/authorization/access-guard';

export const JwtAuthGuard = () => UseGuards(AuthGuard('jwt'));
export const GoogleAuthGuard = () => UseGuards(AuthGuard('google'));
export const GithubAuthGuard = () => UseGuards(AuthGuard('github'));
export const AdminAuthGuard = () => UseGuards(AuthGuard('jwt'), AdminGuard);
export const AccessAuthGuard = () => UseGuards(AuthGuard('jwt'), AccessGuard);
export const PublicAuthGuard = () => UseGuards(AuthGuard('public'));
