import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Usuario } from '../entities/usuario.entity';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectModel(Usuario)
    private usuarioRepository: typeof Usuario,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    try {
      const { email } = createUsuarioDto;
      const verifyUser = await this.findByEmail(email);
      if (verifyUser)
        throw new HttpException(
          `User with email ${email} exists`,
          HttpStatus.BAD_REQUEST,
        );
      const newUser = await this.usuarioRepository.create(createUsuarioDto);
      return await this.findByEmail(newUser.email);
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return this.usuarioRepository.findAll();
  }

  // async findOne(id: number): Promise<Usuario> {
  //   return this.productRepository.findOne({ where: { id } });
  // }

  async findByEmail(email: string): Promise<Usuario> {
    try {
      return await this.usuarioRepository.findOne({
        where: {
          email,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
  //   return `This action updates a #${id} usuario`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} usuario`;
  // }
}
