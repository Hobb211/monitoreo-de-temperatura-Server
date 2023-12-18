import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClickHouse } from 'clickhouse';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    UsuarioModule,
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadModels: true,
        synchronize: true,
      }),
    inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'CLICKHOUSE',
      useFactory: (configService: ConfigService) =>
        new ClickHouse({
          url: configService.get<string>('CLICKHOUSE_URL'),
          port: 8443,
          debug: false,
          basicAuth: {
            username: 'default',
            password: '9gadIswjJ~jdv',
          },
        }),
      inject: [ConfigService],
    },
    {
      provide: 'MONGO',
      useFactory: (configService: ConfigService) =>
        new MongoClient(configService.get<string>('MONGO_URL'),
          {
            serverApi: {
              version: ServerApiVersion.v1,
              strict: true,
              deprecationErrors: true,
            },
          },
        ),
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
