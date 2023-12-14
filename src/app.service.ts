import { Inject, Injectable } from '@nestjs/common';
import * as cron from 'node-cron';
import { ClickHouse } from 'clickhouse';
import { TemperaturaDto } from './dto/clickhouseDto';

@Injectable()
export class AppService {

  constructor(
    @Inject('CLICKHOUSE') private readonly clickhouse: ClickHouse,
  ){
    cron.schedule('0 0 * * *', () => {
      this.average();
    });
  }

  getHello(): string {
    return 'Hello World!';
  }

  async read() {
    const query = `
      SELECT departamento, timestamp AS ultima_medicion, temperatura
      FROM mediciones
      ORDER BY departamento, timestamp DESC
      LIMIT 1 BY departamento
    `;
    const data = await this.clickhouse.query(query).toPromise();
    return JSON.stringify(Array.from(data.entries()));
  }

  async average() {
    const query = `
      SELECT departamento, timestamp, temperatura
      FROM mediciones_temperatura
      WHERE timestamp >= TODAY() AND timestamp < TODAY() + 1;
    `;
    const datosTemperatura = await this.clickhouse.query(query).toPromise();

    const datosPorHora = datosTemperatura.reduce((acumulador, dato: TemperaturaDto) => {
      const hora = dato.timestamp.getHours();
      acumulador[hora] = acumulador[hora] || { total: 0, count: 0 };
      acumulador[hora].total += dato.temperatura;
      acumulador[hora].count += 1;
      return acumulador;
    }, {});

    const promediosPorHora = Object.keys(datosPorHora).map((hora) => {
      const promedio = datosPorHora[hora].total / datosPorHora[hora].count;
      return { hora: parseInt(hora), promedio };
    });
  }
}

function getRandomDecimal(min, max, precision) {
  const factor = Math.pow(10, precision);
  return Math.floor(Math.random() * (max - min + 1) * factor) / factor + min;
}