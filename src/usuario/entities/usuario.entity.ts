import { Column, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'usuario',
})
export class Usuario extends Model<Usuario> {
  @Column
  fullName: string;

  @Column
  email: string;

  @Column
  password: string;
}
