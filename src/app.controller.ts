import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { updateDepartamentDto } from './dto/updateDepartmentDto';
import { createLogDto } from './dto/createLogDto';
import { Usuario } from './dto/createUserDto';
import { UpdateLogDto } from './dto/updateLogDto';
import { Departamento } from './dto/departmentDto';

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

  @Post('/update-log')
  async updateLog(@Body() body: UpdateLogDto) {
    return this.appService.updateLog(body);
  }

  @Get('/read-departament/:id')
  async readDepartament(@Param('id') departamento: string) {
    return this.appService.readDepartament(departamento);
  }

  @Get('/get-departaments')
  async getDepartaments() {
    return this.appService.getDepartaments();
  }

  @Get('/get-historial/:id')
  async getHistorial(@Param('id') departamento: string) {
    return this.appService.getHistorial(departamento);
  }
}
