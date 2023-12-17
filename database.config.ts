import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Usuario } from 'src/usuario/entities/usuario.entity';

export const dataBaseConfig: SequelizeModuleOptions = {
  dialect: 'sqlite',
  storage: '.db/data.sqlite3',
  autoLoadModels: true,
  synchronize: false,
  models: [Usuario],
};
