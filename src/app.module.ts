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
        url: 'http://localhost',
        port: 8123,
        debug: false,
        basicAuth: null,
      })
    }
  ],
})
export class AppModule {}
