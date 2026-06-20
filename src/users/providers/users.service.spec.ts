import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './users.service';
import { User } from '../entities/user.entity';
import { Role } from 'src/common/enums/role.enum';
import { HashingService } from '../../auth/providers/hashing.service';

describe('UserService', () => {
  let service: UserService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockHashingService = {
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.orWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.limit.mockReturnThis();
    mockQueryBuilder.offset.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: HashingService,
          useValue: mockHashingService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPass123!',
        role: Role.PLAYER,
      };

      const mockUser = {
        id: '123',
        ...createUserDto,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockHashingService.hashPassword.mockResolvedValue('hashed-password');
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.username).toBe(createUserDto.username);
      expect(mockHashingService.hashPassword).toHaveBeenCalledTimes(1);
      expect(mockHashingService.hashPassword).toHaveBeenCalledWith(
        createUserDto.password,
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashed-password',
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPass123!',
        role: Role.PLAYER,
      };

      mockQueryBuilder.getOne.mockResolvedValue({
        email: 'test@example.com',
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockHashingService.hashPassword).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const userId = '123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        role: Role.PLAYER,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = '123';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update displayName, avatarUrl, and emailPreferences', async () => {
      const userId = '123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        role: Role.PLAYER,
        displayName: undefined,
        avatarUrl: undefined,
        emailPreferences: undefined,
      };
      const updateUserDto = {
        displayName: 'New Name',
        avatarUrl: '/uploads/avatar.png',
        emailPreferences: { promotional: false, transactional: true },
      };
      const updatedUser = { ...existingUser, ...updateUserDto };
      mockRepository.findOne.mockResolvedValueOnce(existingUser);
      mockRepository.findOne.mockResolvedValueOnce(null); // No conflict
      mockRepository.save.mockResolvedValueOnce(updatedUser);

      await service.update(userId, updateUserDto);
      expect(mockRepository.save).toHaveBeenCalledWith(updatedUser);
      expect(mockHashingService.hashPassword).not.toHaveBeenCalled();
    });

    it('should preserve the existing password hash on unrelated updates', async () => {
      const existingHash = '$2b$12$existing-password-hash';
      const user = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: existingHash,
      };
      mockRepository.findOne.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(user);

      await service.update(user.id, { displayName: 'Updated profile' });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: existingHash }),
      );
      expect(mockHashingService.hashPassword).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.update('notfound', { displayName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if email or username already exists', async () => {
      const userId = '123';
      const existingUser = {
        id: userId,
        email: 'a@b.com',
        username: 'user',
        role: Role.PLAYER,
      };
      mockRepository.findOne.mockResolvedValueOnce(existingUser);
      mockRepository.findOne.mockResolvedValueOnce({
        id: 'other',
        email: 'taken@b.com',
        username: 'otheruser',
      });
      await expect(
        service.update(userId, { email: 'taken@b.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    const user = {
      id: '123',
      email: 'test@example.com',
      password: 'current-hash',
    };

    it('should verify the current password and save one hash of the new password', async () => {
      mockRepository.findOne.mockResolvedValue({ ...user });
      mockHashingService.comparePassword.mockResolvedValue(true);
      mockHashingService.hashPassword.mockResolvedValue('new-hash');

      await service.changePassword(user.id, {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
      });

      expect(mockHashingService.comparePassword).toHaveBeenCalledWith(
        'CurrentPass123!',
        'current-hash',
      );
      expect(mockHashingService.hashPassword).toHaveBeenCalledTimes(1);
      expect(mockHashingService.hashPassword).toHaveBeenCalledWith(
        'NewPass123!',
      );
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-hash' }),
      );
    });

    it('should reject an incorrect current password without hashing', async () => {
      mockRepository.findOne.mockResolvedValue({ ...user });
      mockHashingService.comparePassword.mockResolvedValue(false);

      await expect(
        service.changePassword(user.id, {
          currentPassword: 'WrongPass123!',
          newPassword: 'NewPass123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockHashingService.hashPassword).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should allow login with the password hash saved after a password change', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        password: 'new-password-hash',
      };
      mockQueryBuilder.getOne.mockResolvedValue(user);
      mockHashingService.comparePassword.mockResolvedValue(true);

      const result = await service.validateUser(
        user.email,
        'NewSecurePass123!',
      );

      expect(result).toBe(user);
      expect(mockHashingService.comparePassword).toHaveBeenCalledWith(
        'NewSecurePass123!',
        'new-password-hash',
      );
    });
  });

  describe('updateUserStats', () => {
    it('should update statistics without hashing the existing password', async () => {
      const user = {
        id: '123',
        password: '$2b$12$existing-password-hash',
        gamesPlayed: 2,
        totalScore: 100,
        highestScore: 80,
        currentStreak: 1,
        longestStreak: 2,
      };
      mockRepository.findOne.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(user);

      await service.updateUserStats(user.id, {
        gamesPlayed: 1,
        totalScore: 50,
        highestScore: 120,
      });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: '$2b$12$existing-password-hash',
          gamesPlayed: 3,
          totalScore: 150,
          highestScore: 120,
        }),
      );
      expect(mockHashingService.hashPassword).not.toHaveBeenCalled();
    });
  });
});
