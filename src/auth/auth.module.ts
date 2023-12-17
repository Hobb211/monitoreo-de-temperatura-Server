import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsuarioModule } from 'src/usuario/usuario.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtSecret } from './constans';

@Module({
  imports: [
    JwtModule.register({
      secret: JwtSecret,
      signOptions: { expiresIn: '2h' },
    }),
    UsuarioModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
