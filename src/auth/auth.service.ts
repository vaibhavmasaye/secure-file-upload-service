import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User } from './entities/user.model';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async findById(id: number): Promise<User> {
    const user = await this.userModel.findOne({ where: { id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async register(registerDto: RegisterDto) {
    try {
      console.log(`[Registration] Attempting to register user with email: ${registerDto.email} and username: ${registerDto.username}`);
      
      const existingUser = await this.userModel.findOne({
        where: {
          [Op.or]: [
            { email: registerDto.email },
            { username: registerDto.username }
          ]
        }
      });
      console.log(`[Registration] Existing user check completed. Result: ${existingUser ? 'User found' : 'No existing user'}`);

      if (existingUser) {
        if (existingUser.email === registerDto.email) {
          console.log(`[Registration] Registration failed: Email ${registerDto.email} already exists`);
          throw new ConflictException('Email already exists');
        }
        console.log(`[Registration] Registration failed: Username ${registerDto.username} already exists`);
        throw new ConflictException('Username already exists');
      }

      console.log('[Registration] Creating new user in database...');
      const user = await this.userModel.create({
        email: registerDto.email,
        username: registerDto.username,
        password: registerDto.password
      });
      console.log(`[Registration] User created successfully with ID: ${user.id}`);

      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);
      console.log('[Registration] JWT token generated successfully');
      
      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      };
    } catch (error) {
      console.log('[Registration] Error during registration:', error);
      
      if (error instanceof ConflictException) {
        console.log('[Registration] Conflict error:', error.message);
        throw error;
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('[Registration] Database unique constraint violation');
        throw new ConflictException('Username or email already exists');
      }
      console.log('[Registration] Unexpected error:', error.message);
      throw new Error('Failed to register user: ' + error.message);
    }
  }
}