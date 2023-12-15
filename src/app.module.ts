import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClickHouse } from 'clickhouse';
import { MongoClient, ServerApiVersion } from 'mongodb';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: 'CLICKHOUSE',
      useFactory: () => new ClickHouse({
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
      useFactory: () => new MongoClient('mongodb+srv://user:qfs7bF78noMyzzRD@monitoreo-de-temperatur.4jsexrs.mongodb.net/?retryWrites=true&w=majority', {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      
      }),
    }
  ],
})
export class AppModule {}
