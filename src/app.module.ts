import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClickHouse } from 'clickhouse';

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
      })
    }
  ],
})
export class AppModule {}
