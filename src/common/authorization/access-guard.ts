import { getRequestUser } from '@/request/namespace';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';
import { Role } from '@/user/entities/role.entity';
import type { UploadFile } from '@/type/UploadFile';

type AccessRequest = {
  body: {
    public?: boolean | string;
    assets?: UploadFile[];
  };
};

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(AccessGuard.name);
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AccessRequest>();
    const user = getRequestUser();
    const useRoles = user.roles;
    const isAdmin = useRoles.some((role) => role.name === Role.IntendedRoles.admin);
    const body = request.body || {};
    const isPublic = body.public === 'true' || body.public === true;
    if (isPublic && !isAdmin) {
      throw new ForbiddenException(
        'Only admin can create public content, please set public field to false or remove it.',
      );
    }
    const hasAttachments = body.assets?.length;
    if (hasAttachments && !isAdmin) {
      throw new ForbiddenException('Only admin can upload assets, please remove assets field.');
    }
    return true;
  }
}
