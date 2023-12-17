import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { updateDepartamentDto } from './dto/updateDepartmentDto';
import { createLogDto } from './dto/createLogDto';
import { Usuario } from './dto/createUserDto';

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

  @Post('/update-departaments')
  async updateDepartaments(@Body() body: updateDepartamentDto) {
    return this.appService.updateDepartament(body);
  }

  @Post('/create-log')
  async createLog(@Body() body: createLogDto) {
    return this.appService.createLog(body);
  }

  @Post('/create-user')
  async createUser(@Body() body: Usuario) {
    return this.appService.createUser(body);
  }
}
