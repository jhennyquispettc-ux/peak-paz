import { DataSource } from 'typeorm';
import { PasswordService } from '../../modules/auth/services/password.service.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { UserRole, UserStatus } from '../../modules/users/users.enums.js';

export interface AdminSeedData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function seedAdmin(
  dataSource: DataSource,
  admin: AdminSeedData,
): Promise<'created' | 'already-exists'> {
  const repository = dataSource.getRepository(User);
  const email = admin.email.trim().toLowerCase();

  const exists = await repository
    .createQueryBuilder('user')
    .withDeleted()
    .where('LOWER(user.email) = :email', { email })
    .getExists();
  if (exists) return 'already-exists';

  await repository.save(
    repository.create({
      email,
      passwordHash: await new PasswordService().hash(admin.password),
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    }),
  );
  return 'created';
}
