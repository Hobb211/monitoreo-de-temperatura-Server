import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginUserDto } from '../dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { UsuarioService } from 'src/usuario/services/usuario.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserInput } from '../dto/register-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsuarioService,
    private jwtService: JwtService,
  ) {}

  async register(registerUserInput: RegisterUserInput) {
    try {
      const { password, ...userData } = registerUserInput;

      const usuario = await this.usersService.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });
      delete usuario.password;
      return {
        user: usuario,
        access_token: this.getJwtToken({ id: usuario.id }),
      };
    } catch (error) {
      throw error;
    }
  }

  async login(loginUserInput: LoginUserDto) {
    try {
      const { email, password } = loginUserInput;
      const user = await this.usersService.findByEmail(email);

      if (!user) throw new UnauthorizedException('password or email incorrect');

      if (!bcrypt.compareSync(password, user.password))
        throw new UnauthorizedException('password or email incorrect');

      delete user.password;

      return {
        access_token: await this.getJwtToken({ id: user.id }),
        user: user,
      };
    } catch (error) {
      throw error;
    }
  }

  private getJwtToken(payload: { id: number }) {
    const token = this.jwtService.sign(payload);
    return token;
  }
}
