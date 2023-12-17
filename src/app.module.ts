import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClickHouse } from 'clickhouse';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [
    AuthModule,
    UsuarioModule,
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234',
      database: 'store',
      autoLoadModels: true,
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'CLICKHOUSE',
      useFactory: () =>
        new ClickHouse({
          url: 'https://vcxy28qwe6.us-west-2.aws.clickhouse.cloud',
          port: 8443,
          debug: false,
          basicAuth: {
            username: 'default',
            password: '9gadIswjJ~jdv',
          },
        }),
    },
    {
      provide: 'MONGO',
      useFactory: () =>
        new MongoClient(
          'mongodb+srv://user:qfs7bF78noMyzzRD@monitoreo-de-temperatur.4jsexrs.mongodb.net/?retryWrites=true&w=majority',
          {
            serverApi: {
              version: ServerApiVersion.v1,
              strict: true,
              deprecationErrors: true,
            },
          },
        ),
    },
  ],
})
export class AppModule {}
