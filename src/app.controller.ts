import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }


  @Get('/read')
  async read() {
    return this.appService.read();
  }

  @Get('/create-departaments')
  async createDepartaments() {
    return this.appService.createDepartaments();
  }
}
